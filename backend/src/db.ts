import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { config } from "./config.js";

mkdirSync(dirname(config.dbPath), { recursive: true });

/** SQLite via Node's built-in driver (Node 22+). Swap for Postgres by replacing this module. */
export const db = new DatabaseSync(config.dbPath);
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student','intern','patient','doctor','admin')),
  verified INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
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
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sim_user ON sim_sessions(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS triage_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  language TEXT NOT NULL,
  messages TEXT NOT NULL DEFAULT '[]',
  emergency INTEGER NOT NULL DEFAULT 0,
  record TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_triage_user ON triage_sessions(user_id, created_at DESC);
`);
