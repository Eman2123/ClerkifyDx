import { chat, parseJson } from "./llm.js";
import type { ClinicalCase, Language } from "./cases.js";
import type { SimSession } from "./store.js";

const langInstruction = (lang: Language) =>
  lang === "pcm"
    ? "Reply in simple Nigerian Pidgin English."
    : "Reply in simple, natural English.";

export async function patientReply(c: ClinicalCase, session: SimSession, question: string): Promise<string> {
  const system = `You are a simulated patient in a medical education tool. ${c.patientProfile}
${langInstruction(session.language)}

Rules:
- Stay in character. Speak like a lay person, not a doctor. Never use the diagnosis name.
- Only reveal information when the learner asks about it. Do NOT volunteer the full history.
- Keep replies short (1-3 sentences).
- If asked something not covered below, answer plausibly but non-contradictorily with "no" or "I'm not sure", never inventing new serious symptoms.
- If the learner asks you for a diagnosis or treatment, say you are not a doctor.

Opening presentation: ${c.presentation}
Hidden facts you may reveal when asked:
${c.history.map((h) => `- ${h}`).join("\n")}`;

  const history = session.transcript.slice(-12).map((m) => ({
    role: (m.role === "learner" ? "user" : "assistant") as "user" | "assistant",
    content: m.content,
  }));

  return chat([{ role: "system", content: system }, ...history, { role: "user", content: question }], {
    temperature: 0.5,
    maxTokens: 200,
  });
}

export interface Submission {
  historySummary: string;
  diagnosis: string;
  differentials: string[];
  reasoning?: string;
}

export interface Feedback {
  overallSummary: string;
  strengths: string[];
  missed: { item: string; whyItMatters: string }[];
  reasoningFeedback: string;
  redFlagsMissed: string[];
  diagnosisAssessment: "supported" | "partially_supported" | "not_supported";
  improvements: string[];
  suggestedStudy: string[];
}

export async function reviewClerking(c: ClinicalCase, session: SimSession, sub: Submission): Promise<Feedback> {
  const transcript = session.transcript.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
  const system = `You are a clinical educator giving educational feedback to a medical student or intern on a SIMULATED case. ${langInstruction(session.language)}
Be constructive, specific and concise. Only judge what the learner actually asked/recorded in the transcript. Do not invent facts.
This is educational feedback, not certification of competence.

Return ONLY a JSON object with keys:
overallSummary (string), strengths (string[]), missed ({item, whyItMatters}[]), reasoningFeedback (string),
redFlagsMissed (string[]), diagnosisAssessment ("supported"|"partially_supported"|"not_supported"),
improvements (string[]), suggestedStudy (string[]).

Reference (hidden from learner):
Diagnosis: ${c.diagnosis}
Differentials: ${c.differentials.join(", ")}
Key questions expected: ${c.keyQuestions.join("; ")}
Red flags: ${c.redFlags.join("; ")}
Learning points: ${c.learningPoints.join("; ")}`;

  const user = `TRANSCRIPT:\n${transcript || "(no questions asked)"}

LEARNER SUBMISSION:
History summary: ${sub.historySummary}
Leading diagnosis: ${sub.diagnosis}
Differentials: ${sub.differentials.join(", ") || "none"}
Reasoning: ${sub.reasoning ?? "not provided"}`;

  const raw = await chat([{ role: "system", content: system }, { role: "user", content: user }], {
    json: true,
    temperature: 0.2,
    maxTokens: 900,
  });
  const fb = parseJson<Partial<Feedback>>(raw);
  return {
    overallSummary: fb.overallSummary ?? "",
    strengths: fb.strengths ?? [],
    missed: fb.missed ?? [],
    reasoningFeedback: fb.reasoningFeedback ?? "",
    redFlagsMissed: fb.redFlagsMissed ?? [],
    diagnosisAssessment: fb.diagnosisAssessment ?? "partially_supported",
    improvements: fb.improvements ?? [],
    suggestedStudy: fb.suggestedStudy ?? [],
  };
}
