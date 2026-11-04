import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { config } from "./config.js";
import { cases, departments } from "./cases.js";
import { sims, triages } from "./store.js";
import { patientReply, reviewClerking } from "./simulation.js";
import { buildRecord, triageReply } from "./triage.js";
import { AI_DISCLAIMER, EMERGENCY_MESSAGE, detectEmergency } from "./safety.js";
import { login, loginSchema, optionalAuth, register, registerSchema, requireAuth, seedAdmin } from "./auth.js";
import { consultations, profiles } from "./professional.js";
import { caseAvailable, imageFilePath, publicImage, readImage } from "./visual.js";
import { seedDemo } from "./demo.js";

const app = express();
if (config.isProd) app.set("trust proxy", 1); // behind Render/Railway: needed for correct client IPs in rate limiting
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: config.corsOrigins }));
app.use(express.json({ limit: "100kb" }));

// Brute-force protection on auth, and a cap on LLM-backed endpoints (cost control).
app.use("/api/auth", rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: true, legacyHeaders: false }));
const aiLimit = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false });

// Express 4 does not catch rejected promises; forward them to the error handler.
const ah =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

const lang = z.enum(["en", "pcm"]).default("en");
const publicCase = (c: (typeof cases)[number]) => ({
  id: c.id,
  department: c.department,
  difficulty: c.difficulty,
  title: c.title,
  presentation: c.presentation,
  image: publicImage(c),
});
const caseTitle = (id: string) => cases.find((c) => c.id === id);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, model: config.ai.model, mockLlm: config.ai.mock, demo: config.demoSeed });
});

// ---------- Auth ----------
app.post("/api/auth/register", (req, res) => {
  const input = registerSchema.parse(req.body);
  const result = register(input);
  if (!result) return res.status(409).json({ error: "An account with this email already exists" });
  res.status(201).json(result);
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const result = login(email, password);
  if (!result) return res.status(401).json({ error: "Incorrect email or password" });
  res.json(result);
});

app.get("/api/auth/me", requireAuth(), (req, res) => {
  res.json({ user: req.user });
});

// ---------- Student simulation (students & interns only) ----------
const learner = requireAuth("student", "intern");

app.get("/api/cases", learner, (req, res) => {
  const { department, difficulty } = req.query;
  const list = cases
    .filter(caseAvailable)
    .filter((c) => !department || c.department === department)
    .filter((c) => !difficulty || c.difficulty === difficulty)
    .map(publicCase);
  res.json({ departments, cases: list });
});

app.post("/api/simulation/start", learner, (req, res) => {
  const { caseId, language } = z.object({ caseId: z.string(), language: lang }).parse(req.body);
  const c = cases.find((x) => x.id === caseId);
  if (!c || !caseAvailable(c)) return res.status(404).json({ error: "Case not found" });
  const s = sims.create(req.user!.id, caseId, language);
  res.json({ sessionId: s.id, case: publicCase(c), notice: "This is a simulated patient for education only." });
});

// Case images: public on purpose (an <img> tag cannot send a bearer token). File names are neutral and never reveal the diagnosis.
app.get("/api/case-images/:file", (req, res) => {
  const known = cases.find((c) => c.image?.file === req.params.file);
  const path = known && imageFilePath(known.image!.file);
  if (!path) return res.status(404).json({ error: "Not found" });
  res.set("Cache-Control", "public, max-age=86400");
  res.sendFile(path);
});

app.post("/api/simulation/:id/image-read", learner, aiLimit, ah(async (req, res) => {
  const { interpretation } = z.object({ interpretation: z.string().min(3).max(1500) }).parse(req.body);
  const session = sims.get(req.params.id, req.user!.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  if (session.submitted) return res.status(409).json({ error: "This case was already submitted" });
  const c = caseTitle(session.caseId)!;
  if (!c.image || !caseAvailable(c)) return res.status(400).json({ error: "This case has no image" });
  const reading = await readImage(c, interpretation, session.language);
  session.transcript.push({ role: "learner", content: `[Image interpretation] ${interpretation}` });
  sims.saveTranscript(session);
  res.json({ reading, disclaimer: "AI feedback is a learning aid and may contain errors." });
}));

app.post("/api/simulation/:id/message", learner, aiLimit, ah(async (req, res) => {
  const { message } = z.object({ message: z.string().min(1).max(500) }).parse(req.body);
  const session = sims.get(req.params.id, req.user!.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  if (session.submitted) return res.status(409).json({ error: "This case was already submitted" });
  const c = caseTitle(session.caseId)!;
  const reply = await patientReply(c, session, message);
  session.transcript.push({ role: "learner", content: message }, { role: "patient", content: reply });
  sims.saveTranscript(session);
  res.json({ reply });
}));

app.post("/api/simulation/:id/submit", learner, aiLimit, ah(async (req, res) => {
  const body = z
    .object({
      historySummary: z.string().min(1).max(4000),
      diagnosis: z.string().min(1).max(300),
      differentials: z.array(z.string().max(200)).max(8).default([]),
      reasoning: z.string().max(3000).optional(),
    })
    .parse(req.body);
  const session = sims.get(req.params.id, req.user!.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  if (session.submitted) return res.status(409).json({ error: "This case was already submitted" });
  const c = caseTitle(session.caseId)!;
  const feedback = await reviewClerking(c, session, body);
  sims.saveResult(session.id, body, feedback);
  res.json({
    feedback,
    reveal: { diagnosis: c.diagnosis, differentials: c.differentials, learningPoints: c.learningPoints },
    disclaimer: "AI feedback is a learning aid, may contain errors and is not an assessment of clinical competence.",
  });
}));

/** Learning history: past cases, feedback and recurring omissions. */
app.get("/api/me/learning", learner, (req, res) => {
  const rows = sims.list(req.user!.id);
  const done = rows.filter((r) => r.submitted);
  const omissions = new Map<string, number>();
  for (const r of done) {
    const fb = r.feedback as { missed?: { item: string }[] } | undefined;
    for (const m of fb?.missed ?? []) omissions.set(m.item, (omissions.get(m.item) ?? 0) + 1);
  }
  res.json({
    totals: { started: rows.length, completed: done.length },
    recurringOmissions: [...omissions.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([item, count]) => ({ item, count })),
    sessions: rows.map((r) => {
      const c = caseTitle(r.caseId);
      return {
        id: r.id,
        caseId: r.caseId,
        title: c?.title ?? r.caseId,
        department: c?.department,
        difficulty: c?.difficulty,
        submitted: r.submitted,
        diagnosisAssessment: (r.feedback as { diagnosisAssessment?: string } | undefined)?.diagnosisAssessment ?? null,
        createdAt: r.createdAt,
      };
    }),
  });
});

app.get("/api/simulation/:id", learner, (req, res) => {
  const s = sims.get(req.params.id, req.user!.id);
  if (!s) return res.status(404).json({ error: "Session not found" });
  const c = caseTitle(s.caseId)!;
  res.json({
    case: publicCase(c),
    transcript: s.transcript,
    submission: s.submission ?? null,
    feedback: s.feedback ?? null,
    reveal: s.submitted ? { diagnosis: c.diagnosis, differentials: c.differentials, learningPoints: c.learningPoints } : null,
  });
});

// ---------- Patient triage ----------
// Anonymous use is allowed on purpose: emergency guidance must never be blocked by registration.
app.post("/api/triage/start", optionalAuth, (req, res) => {
  const { language, consent } = z.object({ language: lang, consent: z.boolean() }).parse(req.body);
  if (!consent) return res.status(400).json({ error: "Consent is required to continue." });
  const s = triages.create(req.user?.id ?? null, language);
  const first = language === "pcm" ? "Wetin dey worry you today?" : "What health concern brings you here today?";
  res.json({ sessionId: s.id, disclaimer: AI_DISCLAIMER[language], message: first });
});

app.post("/api/triage/:id/message", optionalAuth, aiLimit, ah(async (req, res) => {
  const { message } = z.object({ message: z.string().min(1).max(1000) }).parse(req.body);
  const session = triages.get(req.params.id, req.user?.id ?? null);
  if (!session) return res.status(404).json({ error: "Session not found" });

  // Deterministic safety check runs first and never depends on the LLM.
  if (detectEmergency(message)) {
    session.emergency = true;
    session.messages.push({ role: "user", content: message });
    triages.save(session);
    return res.json({ emergency: true, message: EMERGENCY_MESSAGE[session.language] });
  }
  try {
    const reply = await triageReply(session, message);
    triages.save(session);
    res.json({ emergency: session.emergency, message: reply });
  } catch {
    res.status(503).json({
      error: "AI is temporarily unavailable. If this is urgent, go to the nearest hospital.",
      emergencyGuidance: EMERGENCY_MESSAGE[session.language],
    });
  }
}));

app.post("/api/triage/:id/record", optionalAuth, aiLimit, ah(async (req, res) => {
  const session = triages.get(req.params.id, req.user?.id ?? null);
  if (!session) return res.status(404).json({ error: "Session not found" });
  const record = await buildRecord(session);
  triages.saveRecord(session.id, record);
  res.json({
    record,
    status: "not_reviewed_by_clinician",
    notice: "AI-generated summary of what you told us. It is not a diagnosis and has not been reviewed by a doctor.",
  });
}));

app.get("/api/me/records", requireAuth("patient"), (req, res) => {
  res.json({
    records: triages.list(req.user!.id).map((t) => ({
      id: t.id,
      createdAt: t.createdAt,
      emergency: t.emergency,
      record: t.record ?? null,
      status: "not_reviewed_by_clinician",
    })),
  });
});

// ---------- Doctors & admin verification ----------
app.post("/api/doctor/profile", requireAuth("doctor"), (req, res) => {
  const b = z
    .object({ mdcnNumber: z.string().min(3).max(40), specialty: z.string().min(2).max(80), bio: z.string().max(600).default("") })
    .parse(req.body);
  profiles.upsert(req.user!.id, b.mdcnNumber, b.specialty, b.bio);
  res.json({ status: "pending", notice: "Submitted. An administrator will check your registration before you are listed." });
});

app.get("/api/doctor/profile", requireAuth("doctor"), (req, res) => {
  res.json({ profile: profiles.get(req.user!.id) ?? null });
});

app.get("/api/admin/doctors", requireAuth("admin"), (req, res) => {
  const status = z.enum(["pending", "verified", "rejected"]).default("pending").parse(req.query.status ?? "pending");
  res.json({ doctors: profiles.listByStatus(status) });
});

app.post("/api/admin/doctors/:userId/review", requireAuth("admin"), (req, res) => {
  const { approve } = z.object({ approve: z.boolean() }).parse(req.body);
  if (!profiles.review(req.params.userId, approve)) return res.status(404).json({ error: "Doctor profile not found" });
  res.json({ ok: true });
});

/** Verified doctors only. No contact details are exposed. */
app.get("/api/doctors", requireAuth("patient"), (req, res) => {
  res.json({ doctors: profiles.directory(typeof req.query.specialty === "string" ? req.query.specialty : undefined) });
});

// ---------- Consultations (request -> doctor accepts/declines -> completed) ----------
const consView = (c: NonNullable<ReturnType<typeof consultations.get>>) => ({
  id: c.id, status: c.status, reason: c.reason, doctorNote: c.doctor_note, createdAt: c.created_at, updatedAt: c.updated_at,
});

app.post("/api/consultations", requireAuth("patient"), (req, res) => {
  const b = z
    .object({ doctorId: z.string(), triageSessionId: z.string(), reason: z.string().max(500).default(""), shareSummary: z.boolean() })
    .parse(req.body);
  if (!b.shareSummary) return res.status(400).json({ error: "You must agree to share your summary with this doctor." });
  const session = triages.get(b.triageSessionId, req.user!.id);
  if (!session || session.userId !== req.user!.id) return res.status(404).json({ error: "Intake session not found" });
  if (session.emergency)
    return res.status(409).json({ error: "Your intake flagged possible emergency symptoms. Please go to the nearest hospital now instead of booking an online consultation." });
  if (!session.record) return res.status(409).json({ error: "Please finish your intake summary first." });
  const doc = profiles.directory().find((d) => d.id === b.doctorId);
  if (!doc) return res.status(404).json({ error: "Doctor not available" });
  if (consultations.duplicateOpen(req.user!.id, doc.id, session.id)) return res.status(409).json({ error: "You already have an open request with this doctor." });
  const id = consultations.create(req.user!.id, doc.id, session.id, b.reason);
  res.status(201).json({ id, status: "requested", notice: "Request sent. No doctor has reviewed your case yet. If your symptoms get worse, go to a hospital." });
});

app.get("/api/consultations", requireAuth("patient", "doctor"), (req, res) => {
  if (req.user!.role === "patient") {
    return res.json({ consultations: consultations.forPatient(req.user!.id).map((c) => ({ ...consView(c), doctorName: c.doctor_name, specialty: c.specialty })) });
  }
  res.json({ consultations: consultations.forDoctor(req.user!.id).map((c) => ({ ...consView(c), patientName: c.patient_name })) });
});

app.get("/api/consultations/:id", requireAuth("doctor"), (req, res) => {
  const c = consultations.get(req.params.id);
  if (!c || c.doctor_id !== req.user!.id) return res.status(404).json({ error: "Not found" });
  // Minimum necessary: the patient's summary is shared only after the doctor accepts.
  const canSee = c.status === "accepted" || c.status === "completed";
  const record = canSee ? (triages.getUnchecked(c.triage_session_id)?.record ?? null) : null;
  res.json({ ...consView(c), reason: c.reason, record, recordShared: canSee, notice: "AI-generated patient summary. Verify with the patient." });
});

app.post("/api/consultations/:id/respond", requireAuth("doctor"), (req, res) => {
  if (!req.user!.verified) return res.status(403).json({ error: "Your account is not verified yet" });
  const { action, note } = z.object({ action: z.enum(["accept", "decline", "complete"]), note: z.string().max(1000).optional() }).parse(req.body);
  const c = consultations.get(req.params.id);
  if (!c || c.doctor_id !== req.user!.id) return res.status(404).json({ error: "Not found" });
  const ok =
    action === "accept" ? consultations.transition(c.id, ["requested"], "accepted", note)
    : action === "decline" ? consultations.transition(c.id, ["requested"], "declined", note)
    : consultations.transition(c.id, ["accepted"], "completed", note);
  if (!ok) return res.status(409).json({ error: `Cannot ${action} a consultation that is ${c.status}` });
  res.json({ status: consultations.get(c.id)!.status });
});

app.post("/api/consultations/:id/cancel", requireAuth("patient"), (req, res) => {
  const c = consultations.get(req.params.id);
  if (!c || c.patient_id !== req.user!.id) return res.status(404).json({ error: "Not found" });
  if (!consultations.transition(c.id, ["requested", "accepted"], "cancelled")) return res.status(409).json({ error: `Cannot cancel a ${c.status} consultation` });
  res.json({ status: "cancelled" });
});

// ---------- Errors ----------
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof z.ZodError) return res.status(400).json({ error: "Invalid request", details: err.flatten() });
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});

seedAdmin();
if (config.demoSeed) seedDemo(console.log);
app.listen(config.port, () => {
  console.log(`ClerkifyDx API on :${config.port} (model: ${config.ai.model}, mock: ${config.ai.mock})`);
});
