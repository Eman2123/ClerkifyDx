import { chat, parseJson } from "./llm.js";
import { PIDGIN_STYLE } from "./lang.js";
import type { Language } from "./cases.js";
import type { TriageSession } from "./store.js";

const langInstruction = (lang: Language) =>
  lang === "pcm" ? PIDGIN_STYLE : "Use simple, plain English.";

export const TRIAGE_SYSTEM = (lang: Language) => `You are ClerkifyDx's patient intake assistant. You are an AI, NOT a doctor.
${langInstruction(lang)}

Your job: ask ONE short question at a time to collect the presenting complaint, onset, duration, severity, associated symptoms, relevant medical history, medications and allergies. Keep it brief and kind.

Hard rules:
- Never give a diagnosis, never name a specific disease as the cause, never prescribe or give drug doses.
- Never tell the patient their symptoms are harmless or that they do not need a doctor.
- If anything sounds dangerous, tell them to seek emergency care immediately.
- Do not invent phone numbers, ambulance services or hospitals.
- After about 6-8 answers, say you have enough information and that a qualified clinician will review it.`;

export async function triageReply(session: TriageSession, userText: string): Promise<string> {
  session.messages.push({ role: "user", content: userText });
  const reply = await chat([{ role: "system", content: TRIAGE_SYSTEM(session.language) }, ...session.messages.slice(-16)], {
    temperature: 0.3,
    maxTokens: 220,
  });
  session.messages.push({ role: "assistant", content: reply });
  return reply;
}

export interface PatientRecord {
  presentingComplaint: string;
  historyOfComplaint: string;
  associatedSymptoms: string[];
  pastMedicalHistory: string;
  medications: string;
  allergies: string;
  unknown: string[];
  suggestedUrgency: "emergency_now" | "urgent_in_person" | "consultation" | "general_info";
  clinicianNote: string;
}

export async function buildRecord(session: TriageSession): Promise<PatientRecord> {
  const convo = session.messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
  const system = `You summarise a patient intake chat into a structured record for a clinician. Use ONLY information the patient stated. Mark missing items in "unknown". Do NOT diagnose.
Return ONLY JSON with keys: presentingComplaint, historyOfComplaint, associatedSymptoms (string[]), pastMedicalHistory, medications, allergies, unknown (string[]), suggestedUrgency ("emergency_now"|"urgent_in_person"|"consultation"|"general_info"), clinicianNote.
suggestedUrgency is only a preliminary suggestion; when unsure choose the more cautious level.`;
  const raw = await chat([{ role: "system", content: system }, { role: "user", content: convo || "(empty)" }], {
    json: true,
    temperature: 0.1,
    maxTokens: 700,
  });
  const r = parseJson<Partial<PatientRecord>>(raw);
  return {
    presentingComplaint: r.presentingComplaint ?? "unknown",
    historyOfComplaint: r.historyOfComplaint ?? "unknown",
    associatedSymptoms: r.associatedSymptoms ?? [],
    pastMedicalHistory: r.pastMedicalHistory ?? "unknown",
    medications: r.medications ?? "unknown",
    allergies: r.allergies ?? "unknown",
    unknown: r.unknown ?? [],
    suggestedUrgency: session.emergency ? "emergency_now" : r.suggestedUrgency ?? "consultation",
    clinicianNote: r.clinicianNote ?? "",
  };
}
