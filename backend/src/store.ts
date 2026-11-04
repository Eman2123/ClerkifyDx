import { randomUUID } from "node:crypto";
import type { Language } from "./cases.js";
import type { ChatMessage } from "./llm.js";
import { db } from "./db.js";

export const newId = () => randomUUID();

export interface SimSession {
  id: string;
  userId: string;
  caseId: string;
  language: Language;
  transcript: { role: "learner" | "patient"; content: string }[];
  submitted: boolean;
  submission?: unknown;
  feedback?: unknown;
  createdAt: number;
}

export interface TriageSession {
  id: string;
  userId: string | null;
  language: Language;
  consent: boolean;
  messages: ChatMessage[];
  emergency: boolean;
  record?: unknown;
  createdAt: number;
}

type SimRow = {
  id: string; user_id: string; case_id: string; language: Language; transcript: string;
  submitted: number; submission: string | null; feedback: string | null; created_at: number;
};
type TriageRow = {
  id: string; user_id: string | null; language: Language; messages: string;
  emergency: number; record: string | null; created_at: number;
};

const parse = <T>(s: string | null): T | undefined => (s ? (JSON.parse(s) as T) : undefined);

const simFrom = (r: SimRow): SimSession => ({
  id: r.id, userId: r.user_id, caseId: r.case_id, language: r.language,
  transcript: JSON.parse(r.transcript), submitted: !!r.submitted,
  submission: parse(r.submission), feedback: parse(r.feedback), createdAt: r.created_at,
});
const triageFrom = (r: TriageRow): TriageSession => ({
  id: r.id, userId: r.user_id, language: r.language, consent: true,
  messages: JSON.parse(r.messages), emergency: !!r.emergency, record: parse(r.record), createdAt: r.created_at,
});

export const sims = {
  create(userId: string, caseId: string, language: Language): SimSession {
    const id = newId();
    const createdAt = Date.now();
    db.prepare("INSERT INTO sim_sessions (id,user_id,case_id,language,created_at) VALUES (?,?,?,?,?)").run(id, userId, caseId, language, createdAt);
    return { id, userId, caseId, language, transcript: [], submitted: false, createdAt };
  },
  /** Only returns the session if it belongs to the user (prevents reading others' data). */
  get(id: string, userId: string): SimSession | undefined {
    const r = db.prepare("SELECT * FROM sim_sessions WHERE id = ? AND user_id = ?").get(id, userId) as SimRow | undefined;
    return r && simFrom(r);
  },
  saveTranscript(s: SimSession) {
    db.prepare("UPDATE sim_sessions SET transcript = ? WHERE id = ?").run(JSON.stringify(s.transcript), s.id);
  },
  saveResult(id: string, submission: unknown, feedback: unknown) {
    db.prepare("UPDATE sim_sessions SET submitted = 1, submission = ?, feedback = ? WHERE id = ?").run(JSON.stringify(submission), JSON.stringify(feedback), id);
  },
  list(userId: string, limit = 50): SimSession[] {
    const rows = db.prepare("SELECT * FROM sim_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?").all(userId, limit) as SimRow[];
    return rows.map(simFrom);
  },
};

export const triages = {
  create(userId: string | null, language: Language): TriageSession {
    const id = newId();
    const createdAt = Date.now();
    db.prepare("INSERT INTO triage_sessions (id,user_id,language,created_at) VALUES (?,?,?,?)").run(id, userId, language, createdAt);
    return { id, userId, language, consent: true, messages: [], emergency: false, createdAt };
  },
  /** Anonymous sessions are only reachable by id (unguessable UUID); owned sessions require the owner. */
  get(id: string, userId: string | null): TriageSession | undefined {
    const r = db.prepare("SELECT * FROM triage_sessions WHERE id = ?").get(id) as TriageRow | undefined;
    if (!r) return undefined;
    if (r.user_id && r.user_id !== userId) return undefined;
    return triageFrom(r);
  },
  save(s: TriageSession) {
    db.prepare("UPDATE triage_sessions SET messages = ?, emergency = ? WHERE id = ?").run(JSON.stringify(s.messages), s.emergency ? 1 : 0, s.id);
  },
  saveRecord(id: string, record: unknown) {
    db.prepare("UPDATE triage_sessions SET record = ? WHERE id = ?").run(JSON.stringify(record), id);
  },
  list(userId: string, limit = 50): TriageSession[] {
    const rows = db.prepare("SELECT * FROM triage_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?").all(userId, limit) as TriageRow[];
    return rows.map(triageFrom);
  },
};
