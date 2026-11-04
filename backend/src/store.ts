import { randomUUID } from "node:crypto";
import type { Language } from "./cases.js";
import type { ChatMessage } from "./llm.js";

export interface SimSession {
  id: string;
  caseId: string;
  language: Language;
  transcript: { role: "learner" | "patient"; content: string }[];
  submitted: boolean;
  createdAt: number;
}

export interface TriageSession {
  id: string;
  language: Language;
  consent: boolean;
  messages: ChatMessage[];
  emergency: boolean;
  createdAt: number;
}

/** In-memory store for the hackathon prototype. Swap for a database (e.g. Postgres) later. */
export const simSessions = new Map<string, SimSession>();
export const triageSessions = new Map<string, TriageSession>();

export const newId = () => randomUUID();
