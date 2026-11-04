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
import { consultMessages, consultations, profiles, type ConsRow } from "./professional.js";
import { caseAvailable, imageFilePath, publicImage, readImage } from "./visual.js";
import { seedDemo } from "./demo.js";
import { initDb } from "./db.js";

const app = express();
if (config.isProd) app.set("trust proxy", 1); // behind Vercel's proxy: needed for correct client IPs in rate limiting
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
app.post("/api/auth/register", ah(async (req, res) => {
  const input = registerSchema.parse(req.body);
  const result = await register(input);
  if (!result) return res.status(409).json({ error: "An account with this email already exists" });
  res.status(201).json(result);
}));

app.post("/api/auth/login", ah(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const result = await login(email, password);
  if (!result) return res.status(401).json({ error: "Incorrect email or password" });
  res.json(result);
}));

app.get("/api/auth/me", requireAuth(), ah(async (req, res) => {
  res.json({ user: req.user });
}));

// ---------- Student simulation (students & interns only) ----------
const learner = requireAuth("student", "intern");

app.get("/api/cases", learner, ah(async (req, res) => {
  const { department, difficulty } = req.query;
  const list = cases
    .filter(caseAvailable)
    .filter((c) => !department || c.department === department)
    .filter((c) => !difficulty || c.difficulty === difficulty)
    .map(publicCase);
  res.json({ departments, cases: list });
}));

app.post("/api/simulation/start", learner, ah(async (req, res) => {
  const { caseId, language } = z.object({ caseId: z.string(), language: lang }).parse(req.body);
  const c = cases.find((x) => x.id === caseId);
  if (!c || !caseAvailable(c)) return res.status(404).json({ error: "Case not found" });
  const s = await sims.create(req.user!.id, caseId, language);
  res.json({ sessionId: s.id, case: publicCase(c), notice: "This is a simulated patient for education only." });
}));

// Case images: public on purpose (an <img> tag cannot send a bearer token). File names are neutral and never reveal the diagnosis.
app.get("/api/case-images/:file", ah(async (req, res) => {
  const known = cases.find((c) => c.image?.file === req.params.file);
  const path = known && imageFilePath(known.image!.file);
  if (!path) return res.status(404).json({ error: "Not found" });
  res.set("Cache-Control", "public, max-age=86400");
  res.sendFile(path);
}));

app.post("/api/simulation/:id/image-read", learner, aiLimit, ah(async (req, res) => {
  const { interpretation } = z.object({ interpretation: z.string().min(3).max(1500) }).parse(req.body);
  const session = await sims.get(req.params.id, req.user!.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  if (session.submitted) return res.status(409).json({ error: "This case was already submitted" });
  const c = caseTitle(session.caseId)!;
  if (!c.image || !caseAvailable(c)) return res.status(400).json({ error: "This case has no image" });
  const reading = await readImage(c, interpretation, session.language);
  session.transcript.push({ role: "learner", content: `[Image interpretation] ${interpretation}` });
  await sims.saveTranscript(session);
  res.json({ reading, disclaimer: "AI feedback is a learning aid and may contain errors." });
}));

app.post("/api/simulation/:id/message", learner, aiLimit, ah(async (req, res) => {
  const { message } = z.object({ message: z.string().min(1).max(500) }).parse(req.body);
  const session = await sims.get(req.params.id, req.user!.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  if (session.submitted) return res.status(409).json({ error: "This case was already submitted" });
  const c = caseTitle(session.caseId)!;
  const reply = await patientReply(c, session, message);
  session.transcript.push({ role: "learner", content: message }, { role: "patient", content: reply });
  await sims.saveTranscript(session);
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
  const session = await sims.get(req.params.id, req.user!.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  if (session.submitted) return res.status(409).json({ error: "This case was already submitted" });
  const c = caseTitle(session.caseId)!;
  const feedback = await reviewClerking(c, session, body);
  await sims.saveResult(session.id, body, feedback);
  res.json({
    feedback,
    reveal: { diagnosis: c.diagnosis, differentials: c.differentials, learningPoints: c.learningPoints },
    disclaimer: "AI feedback is a learning aid, may contain errors and is not an assessment of clinical competence.",
  });
}));

/** Learning history: past cases, feedback and recurring omissions. */
app.get("/api/me/learning", learner, ah(async (req, res) => {
  const rows = await sims.list(req.user!.id);
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
}));

app.get("/api/simulation/:id", learner, ah(async (req, res) => {
  const s = await sims.get(req.params.id, req.user!.id);
  if (!s) return res.status(404).json({ error: "Session not found" });
  const c = caseTitle(s.caseId)!;
  res.json({
    case: publicCase(c),
    transcript: s.transcript,
    submission: s.submission ?? null,
    feedback: s.feedback ?? null,
    reveal: s.submitted ? { diagnosis: c.diagnosis, differentials: c.differentials, learningPoints: c.learningPoints } : null,
  });
}));

// ---------- Patient triage ----------
// Anonymous use is allowed on purpose: emergency guidance must never be blocked by registration.
app.post("/api/triage/start", optionalAuth, ah(async (req, res) => {
  const { language, consent } = z.object({ language: lang, consent: z.boolean() }).parse(req.body);
  if (!consent) return res.status(400).json({ error: "Consent is required to continue." });
  const s = await triages.create(req.user?.id ?? null, language);
  const first = language === "pcm" ? "Wetin dey worry you today?" : "What health concern brings you here today?";
  res.json({ sessionId: s.id, disclaimer: AI_DISCLAIMER[language], message: first });
}));

app.post("/api/triage/:id/message", optionalAuth, aiLimit, ah(async (req, res) => {
  const { message } = z.object({ message: z.string().min(1).max(1000) }).parse(req.body);
  const session = await triages.get(req.params.id, req.user?.id ?? null);
  if (!session) return res.status(404).json({ error: "Session not found" });

  // Deterministic safety check runs first and never depends on the LLM.
  if (detectEmergency(message)) {
    session.emergency = true;
    session.messages.push({ role: "user", content: message });
    await triages.save(session);
    return res.json({ emergency: true, message: EMERGENCY_MESSAGE[session.language] });
  }
  try {
    const reply = await triageReply(session, message);
    await triages.save(session);
    res.json({ emergency: session.emergency, message: reply });
  } catch {
    res.status(503).json({
      error: "AI is temporarily unavailable. If this is urgent, go to the nearest hospital.",
      emergencyGuidance: EMERGENCY_MESSAGE[session.language],
    });
  }
}));

app.post("/api/triage/:id/record", optionalAuth, aiLimit, ah(async (req, res) => {
  const session = await triages.get(req.params.id, req.user?.id ?? null);
  if (!session) return res.status(404).json({ error: "Session not found" });
  const record = await buildRecord(session);
  await triages.saveRecord(session.id, record);
  res.json({
    record,
    status: "not_reviewed_by_clinician",
    notice: "AI-generated summary of what you told us. It is not a diagnosis and has not been reviewed by a doctor.",
  });
}));

app.get("/api/me/records", requireAuth("patient"), ah(async (req, res) => {
  res.json({
    records: (await triages.list(req.user!.id)).map((t) => ({
      id: t.id,
      createdAt: t.createdAt,
      emergency: t.emergency,
      record: t.record ?? null,
      status: "not_reviewed_by_clinician",
    })),
  });
}));

// ---------- Doctors & admin verification ----------
app.post("/api/doctor/profile", requireAuth("doctor"), ah(async (req, res) => {
  const b = z
    .object({ mdcnNumber: z.string().min(3).max(40), specialty: z.string().min(2).max(80), bio: z.string().max(600).default("") })
    .parse(req.body);
  await profiles.upsert(req.user!.id, b.mdcnNumber, b.specialty, b.bio);
  res.json({ status: "pending", notice: "Submitted. An administrator will check your registration before you are listed." });
}));

app.get("/api/doctor/profile", requireAuth("doctor"), ah(async (req, res) => {
  res.json({ profile: (await profiles.get(req.user!.id)) ?? null });
}));

app.get("/api/admin/doctors", requireAuth("admin"), ah(async (req, res) => {
  const status = z.enum(["pending", "verified", "rejected"]).default("pending").parse(req.query.status ?? "pending");
  res.json({ doctors: await profiles.listByStatus(status) });
}));

app.post("/api/admin/doctors/:userId/review", requireAuth("admin"), ah(async (req, res) => {
  const { approve } = z.object({ approve: z.boolean() }).parse(req.body);
  if (!(await profiles.review(req.params.userId, approve))) return res.status(404).json({ error: "Doctor profile not found" });
  res.json({ ok: true });
}));

/** Verified doctors only. No contact details are exposed. */
app.get("/api/doctors", requireAuth("patient"), ah(async (req, res) => {
  res.json({ doctors: await profiles.directory(typeof req.query.specialty === "string" ? req.query.specialty : undefined) });
}));

// ---------- Consultations (request -> doctor accepts/declines -> completed) ----------
const consView = (c: ConsRow) => ({
  id: c.id, status: c.status, reason: c.reason, doctorNote: c.doctor_note, createdAt: c.created_at, updatedAt: c.updated_at,
});

app.post("/api/consultations", requireAuth("patient"), ah(async (req, res) => {
  const b = z
    .object({ doctorId: z.string(), triageSessionId: z.string(), reason: z.string().max(500).default(""), shareSummary: z.boolean() })
    .parse(req.body);
  if (!b.shareSummary) return res.status(400).json({ error: "You must agree to share your summary with this doctor." });
  const session = await triages.get(b.triageSessionId, req.user!.id);
  if (!session || session.userId !== req.user!.id) return res.status(404).json({ error: "Intake session not found" });
  if (session.emergency)
    return res.status(409).json({ error: "Your intake flagged possible emergency symptoms. Please go to the nearest hospital now instead of booking an online consultation." });
  if (!session.record) return res.status(409).json({ error: "Please finish your intake summary first." });
  const doc = (await profiles.directory()).find((d) => d.id === b.doctorId);
  if (!doc) return res.status(404).json({ error: "Doctor not available" });
  if (await consultations.duplicateOpen(req.user!.id, doc.id, session.id)) return res.status(409).json({ error: "You already have an open request with this doctor." });
  const id = await consultations.create(req.user!.id, doc.id, session.id, b.reason);
  res.status(201).json({ id, status: "requested", notice: "Request sent. No doctor has reviewed your case yet. If your symptoms get worse, go to a hospital." });
}));

app.get("/api/consultations", requireAuth("patient", "doctor"), ah(async (req, res) => {
  if (req.user!.role === "patient") {
    return res.json({ consultations: (await consultations.forPatient(req.user!.id)).map((c) => ({ ...consView(c), doctorName: c.doctor_name, specialty: c.specialty })) });
  }
  res.json({ consultations: (await consultations.forDoctor(req.user!.id)).map((c) => ({ ...consView(c), patientName: c.patient_name })) });
}));

app.get("/api/consultations/:id", requireAuth("doctor"), ah(async (req, res) => {
  const c = await consultations.get(req.params.id);
  if (!c || c.doctor_id !== req.user!.id) return res.status(404).json({ error: "Not found" });
  // Minimum necessary: the patient's summary is shared only after the doctor accepts.
  const canSee = c.status === "accepted" || c.status === "completed";
  const record = canSee ? ((await triages.getUnchecked(c.triage_session_id))?.record ?? null) : null;
  res.json({ ...consView(c), reason: c.reason, record, recordShared: canSee, notice: "AI-generated patient summary. Verify with the patient." });
}));

app.post("/api/consultations/:id/respond", requireAuth("doctor"), ah(async (req, res) => {
  if (!req.user!.verified) return res.status(403).json({ error: "Your account is not verified yet" });
  const { action, note } = z.object({ action: z.enum(["accept", "decline", "complete"]), note: z.string().max(1000).optional() }).parse(req.body);
  const c = await consultations.get(req.params.id);
  if (!c || c.doctor_id !== req.user!.id) return res.status(404).json({ error: "Not found" });
  const ok =
    action === "accept" ? await consultations.transition(c.id, ["requested"], "accepted", note)
    : action === "decline" ? await consultations.transition(c.id, ["requested"], "declined", note)
    : await consultations.transition(c.id, ["accepted"], "completed", note);
  if (!ok) return res.status(409).json({ error: `Cannot ${action} a consultation that is ${c.status}` });
  res.json({ status: (await consultations.get(c.id))!.status });
}));

app.post("/api/consultations/:id/cancel", requireAuth("patient"), ah(async (req, res) => {
  const c = await consultations.get(req.params.id);
  if (!c || c.patient_id !== req.user!.id) return res.status(404).json({ error: "Not found" });
  if (!(await consultations.transition(c.id, ["requested", "accepted"], "cancelled"))) return res.status(409).json({ error: `Cannot cancel a ${c.status} consultation` });
  res.json({ status: "cancelled" });
}));

// Chat for an accepted consultation (polling-based). Participants only; opens only after the doctor accepts.
const chatParty = requireAuth("patient", "doctor");
const loadChat = async (req: Request, res: Response) => {
  const c = await consultations.get(req.params.id);
  if (!c || (c.patient_id !== req.user!.id && c.doctor_id !== req.user!.id)) {
    res.status(404).json({ error: "Not found" });
    return null;
  }
  if (c.status !== "accepted" && c.status !== "completed") {
    res.status(409).json({ error: "Chat opens only after the doctor accepts the request." });
    return null;
  }
  return c;
};
const chatView = async (c: ConsRow, userId: string) =>
  (await consultMessages.list(c.id)).map((m) => ({ id: m.id, mine: m.sender_id === userId, from: m.sender_id === c.doctor_id ? "doctor" : "patient", body: m.body, createdAt: m.created_at }));

app.get("/api/consultations/:id/messages", chatParty, ah(async (req, res) => {
  const c = await loadChat(req, res);
  if (!c) return;
  res.json({ status: c.status, messages: await chatView(c, req.user!.id) });
}));

app.post("/api/consultations/:id/messages", chatParty, rateLimit({ windowMs: 60_000, limit: 40 }), ah(async (req, res) => {
  const { body } = z.object({ body: z.string().trim().min(1).max(1000) }).parse(req.body);
  const c = await loadChat(req, res);
  if (!c) return;
  if (c.status !== "accepted") return res.status(409).json({ error: "This consultation is completed; the chat is read-only." });
  await consultMessages.add(c.id, req.user!.id, body);
  // Chat is not an emergency channel: patients writing red-flag symptoms get the same deterministic guidance.
  const emergencyNotice = req.user!.role === "patient" && detectEmergency(body) ? EMERGENCY_MESSAGE.en : undefined;
  res.status(201).json({ messages: await chatView(c, req.user!.id), emergencyNotice });
}));

// ---------- Errors ----------
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof z.ZodError) return res.status(400).json({ error: "Invalid request", details: err.flatten() });
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});

let readyPromise: Promise<void> | null = null;

/** One-time startup work (schema, admin, demo accounts). Memoised so serverless cold starts do it once per instance. */
export function ready(): Promise<void> {
  if (!config.databaseUrl) return Promise.reject(new Error("DATABASE_URL is not set. Add your Neon connection string in the Vercel project's environment variables."));
  readyPromise ??= (async () => {
    await initDb();
    await seedAdmin();
    if (config.demoSeed) await seedDemo(console.log);
  })().catch((e) => {
    readyPromise = null; // allow a retry on the next request
    throw e;
  });
  return readyPromise;
}

export { app };
