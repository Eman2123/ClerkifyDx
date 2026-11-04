import pg from "pg";
import { config } from "./config.js";

// BIGINT (int8) is returned as a string by default. Our timestamps are epoch milliseconds,
// which are safely representable as JS numbers, so parse them back to numbers.
pg.types.setTypeParser(20, (v) => Number(v));

/** Postgres (Neon) connection pool. Neon connection strings already include sslmode=require. */
export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: config.isProd ? 3 : 10, // serverless: many instances, keep each pool small
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
});
// Neon closes idle connections when a compute scales to zero; without this handler that would crash the process.
pool.on("error", (err) => console.error("Postgres pool error:", err.message));

/** Run a query and return all rows. Use $1, $2, ... placeholders. */
export async function query<T = Record<string, any>>(text: string, params: unknown[] = []): Promise<T[]> {
  const r = await pool.query(text, params as any[]);
  return r.rows as T[];
}

/** Run a query and return the first row (or undefined). */
export async function queryOne<T = Record<string, any>>(text: string, params: unknown[] = []): Promise<T | undefined> {
  return (await query<T>(text, params))[0];
}

/** Run a statement and return the number of affected rows. */
export async function exec(text: string, params: unknown[] = []): Promise<number> {
  const r = await pool.query(text, params as any[]);
  return r.rowCount ?? 0;
}

/** Run several statements atomically. */
export async function withTx<T>(fn: (q: (text: string, params?: unknown[]) => Promise<pg.QueryResult>) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const out = await fn((text, params = []) => client.query(text, params as any[]));
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student','intern','patient','doctor','admin')),
  verified INTEGER NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS sim_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  case_id TEXT NOT NULL,
  language TEXT NOT NULL,
  transcript TEXT NOT NULL DEFAULT '[]',
  submitted INTEGER NOT NULL DEFAULT 0,
  submission TEXT,
  feedback TEXT,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sim_user ON sim_sessions(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS triage_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  language TEXT NOT NULL,
  messages TEXT NOT NULL DEFAULT '[]',
  emergency INTEGER NOT NULL DEFAULT 0,
  record TEXT,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_triage_user ON triage_sessions(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS doctor_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  mdcn_number TEXT NOT NULL,
  specialty TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
  reviewed_at BIGINT,
  created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS consultations (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  triage_session_id TEXT NOT NULL REFERENCES triage_sessions(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','accepted','declined','completed','cancelled')),
  doctor_note TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cons_patient ON consultations(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cons_doctor ON consultations(doctor_id, created_at DESC);
CREATE TABLE IF NOT EXISTS consultation_messages (
  seq BIGSERIAL,
  id TEXT PRIMARY KEY,
  consultation_id TEXT NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cmsg ON consultation_messages(consultation_id, created_at, seq);
`;

/** Creates tables if they do not exist. Call once at startup, before serving requests. */
export async function initDb(): Promise<void> {
  await pool.query(SCHEMA);
}
