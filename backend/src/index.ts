import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { z } from "zod";
import { config } from "./config.js";
import { cases, departments } from "./cases.js";
import { newId, simSessions, triageSessions } from "./store.js";
import { patientReply, reviewClerking } from "./simulation.js";
import { buildRecord, triageReply } from "./triage.js";
import { AI_DISCLAIMER, EMERGENCY_MESSAGE, detectEmergency } from "./safety.js";

const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: "100kb" }));

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

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, model: config.llama.model, mockLlm: config.llama.mock });
});

// ---------- Student simulation ----------
app.get("/api/cases", (req, res) => {
  const { department, difficulty } = req.query;
  const list = cases
    .filter((c) => !department || c.department === department)
    .filter((c) => !difficulty || c.difficulty === difficulty)
    .map(publicCase);
  res.json({ departments, cases: list });
});

app.post("/api/simulation/start", (req, res) => {
  const { caseId, language } = z.object({ caseId: z.string(), language: lang }).parse(req.body);
  const c = cases.find((x) => x.id === caseId);
  if (!c) return res.status(404).json({ error: "Case not found" });
  const id = newId();
  simSessions.set(id, { id, caseId, language, transcript: [], submitted: false, createdAt: Date.now() });
  res.json({ sessionId: id, case: publicCase(c), notice: "This is a simulated patient for education only." });
});

app.post("/api/simulation/:id/message", ah(async (req, res) => {
  const { message } = z.object({ message: z.string().min(1).max(500) }).parse(req.body);
  const session = simSessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  const c = cases.find((x) => x.id === session.caseId)!;
  const reply = await patientReply(c, session, message);
  session.transcript.push({ role: "learner", content: message }, { role: "patient", content: reply });
  res.json({ reply });
}));

app.post("/api/simulation/:id/submit", ah(async (req, res) => {
  const body = z
    .object({
      historySummary: z.string().min(1).max(4000),
      diagnosis: z.string().min(1).max(300),
      differentials: z.array(z.string().max(200)).max(8).default([]),
      reasoning: z.string().max(3000).optional(),
    })
    .parse(req.body);
  const session = simSessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  const c = cases.find((x) => x.id === session.caseId)!;
  const feedback = await reviewClerking(c, session, body);
  session.submitted = true;
  res.json({
    feedback,
    reveal: { diagnosis: c.diagnosis, differentials: c.differentials, learningPoints: c.learningPoints },
    disclaimer: "AI feedback is a learning aid, may contain errors and is not an assessment of clinical competence.",
  });
}));

// ---------- Patient triage (prototype: no doctor connection yet) ----------
app.post("/api/triage/start", (req, res) => {
  const { language, consent } = z.object({ language: lang, consent: z.boolean() }).parse(req.body);
  if (!consent) return res.status(400).json({ error: "Consent is required to continue." });
  const id = newId();
  triageSessions.set(id, { id, language, consent, messages: [], emergency: false, createdAt: Date.now() });
  const first =
    language === "pcm" ? "Wetin dey worry you today?" : "What health concern brings you here today?";
  res.json({ sessionId: id, disclaimer: AI_DISCLAIMER[language], message: first });
});

app.post("/api/triage/:id/message", ah(async (req, res) => {
  const { message } = z.object({ message: z.string().min(1).max(1000) }).parse(req.body);
  const session = triageSessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });

  // Deterministic safety check runs first and never depends on the LLM.
  if (detectEmergency(message)) {
    session.emergency = true;
    session.messages.push({ role: "user", content: message });
    return res.json({ emergency: true, message: EMERGENCY_MESSAGE[session.language] });
  }
  try {
    const reply = await triageReply(session, message);
    res.json({ emergency: session.emergency, message: reply });
  } catch {
    res.status(503).json({
      error: "AI is temporarily unavailable. If this is urgent, go to the nearest hospital.",
      emergencyGuidance: EMERGENCY_MESSAGE[session.language],
    });
  }
}));

app.post("/api/triage/:id/record", ah(async (req, res) => {
  const session = triageSessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  const record = await buildRecord(session);
  res.json({
    record,
    status: "not_reviewed_by_clinician",
    notice: "AI-generated summary of what you told us. It is not a diagnosis and has not been reviewed by a doctor.",
  });
}));

// ---------- Errors ----------
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof z.ZodError) return res.status(400).json({ error: "Invalid request", details: err.flatten() });
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});

app.listen(config.port, () => {
  console.log(`ClerkifyDx API on :${config.port} (model: ${config.llama.model}, mock: ${config.llama.mock})`);
});
