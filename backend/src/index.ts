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
import { login, loginSchema, optionalAuth, register, registerSchema, requireAuth } from "./auth.js";

const app = express();
app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
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
});
const caseTitle = (id: string) => cases.find((c) => c.id === id);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, model: config.llama.model, mockLlm: config.llama.mock });
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
    .filter((c) => !department || c.department === department)
    .filter((c) => !difficulty || c.difficulty === difficulty)
    .map(publicCase);
  res.json({ departments, cases: list });
});

app.post("/api/simulation/start", learner, (req, res) => {
  const { caseId, language } = z.object({ caseId: z.string(), language: lang }).parse(req.body);
  const c = cases.find((x) => x.id === caseId);
  if (!c) return res.status(404).json({ error: "Case not found" });
  const s = sims.create(req.user!.id, caseId, language);
  res.json({ sessionId: s.id, case: publicCase(c), notice: "This is a simulated patient for education only." });
});

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

// ---------- Errors ----------
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof z.ZodError) return res.status(400).json({ error: "Invalid request", details: err.flatten() });
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});

app.listen(config.port, () => {
  console.log(`ClerkifyDx API on :${config.port} (model: ${config.llama.model}, mock: ${config.llama.mock})`);
});
