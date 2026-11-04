import { randomUUID } from "node:crypto";
import type { Language } from "./cases.js";
import type { ChatMessage } from "./llm.js";
import { exec, query, queryOne } from "./db.js";

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
  async create(userId: string, caseId: string, language: Language): Promise<SimSession> {
    const id = newId();
    const createdAt = Date.now();
    await exec("INSERT INTO sim_sessions (id,user_id,case_id,language,created_at) VALUES ($1,$2,$3,$4,$5)", [id, userId, caseId, language, createdAt]);
    return { id, userId, caseId, language, transcript: [], submitted: false, createdAt };
  },
  /** Only returns the session if it belongs to the user (prevents reading others' data). */
  async get(id: string, userId: string): Promise<SimSession | undefined> {
    const r = await queryOne<SimRow>("SELECT * FROM sim_sessions WHERE id = $1 AND user_id = $2", [id, userId]);
    return r && simFrom(r);
  },
  async saveTranscript(s: SimSession): Promise<void> {
    await exec("UPDATE sim_sessions SET transcript = $1 WHERE id = $2", [JSON.stringify(s.transcript), s.id]);
  },
  async saveResult(id: string, submission: unknown, feedback: unknown): Promise<void> {
    await exec("UPDATE sim_sessions SET submitted = 1, submission = $1, feedback = $2 WHERE id = $3", [JSON.stringify(submission), JSON.stringify(feedback), id]);
  },
  async list(userId: string, limit = 50): Promise<SimSession[]> {
    const rows = await query<SimRow>("SELECT * FROM sim_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2", [userId, limit]);
    return rows.map(simFrom);
  },
};

export const triages = {
  async create(userId: string | null, language: Language): Promise<TriageSession> {
    const id = newId();
    const createdAt = Date.now();
    await exec("INSERT INTO triage_sessions (id,user_id,language,created_at) VALUES ($1,$2,$3,$4)", [id, userId, language, createdAt]);
    return { id, userId, language, consent: true, messages: [], emergency: false, createdAt };
  },
  /** Anonymous sessions are only reachable by id (unguessable UUID); owned sessions require the owner. */
  async get(id: string, userId: string | null): Promise<TriageSession | undefined> {
    const r = await queryOne<TriageRow>("SELECT * FROM triage_sessions WHERE id = $1", [id]);
    if (!r) return undefined;
    if (r.user_id && r.user_id !== userId) return undefined;
    return triageFrom(r);
  },
  /** Skips the owner check. Only call after a consultation's access rules have been verified. */
  async getUnchecked(id: string): Promise<TriageSession | undefined> {
    const r = await queryOne<TriageRow>("SELECT * FROM triage_sessions WHERE id = $1", [id]);
    return r && triageFrom(r);
  },
  async save(s: TriageSession): Promise<void> {
    await exec("UPDATE triage_sessions SET messages = $1, emergency = $2 WHERE id = $3", [JSON.stringify(s.messages), s.emergency ? 1 : 0, s.id]);
  },
  async saveRecord(id: string, record: unknown): Promise<void> {
    await exec("UPDATE triage_sessions SET record = $1 WHERE id = $2", [JSON.stringify(record), id]);
  },
  async list(userId: string, limit = 50): Promise<TriageSession[]> {
    const rows = await query<TriageRow>("SELECT * FROM triage_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2", [userId, limit]);
    return rows.map(triageFrom);
  },
};
