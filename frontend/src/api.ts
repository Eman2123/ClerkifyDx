export type Language = "en" | "pcm";
export type Difficulty = "simple" | "intermediate" | "complex";

export interface CaseSummary {
  id: string;
  department: string;
  difficulty: Difficulty;
  title: string;
  presentation: string;
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

const post = <T,>(path: string, body: unknown) =>
  request<T>(path, { method: "POST", body: JSON.stringify(body) });

export const api = {
  health: () => request<{ ok: boolean; model: string; mockLlm: boolean }>("/health"),
  cases: () => request<{ departments: string[]; cases: CaseSummary[] }>("/cases"),
  startSim: (caseId: string, language: Language) =>
    post<{ sessionId: string; case: CaseSummary; notice: string }>("/simulation/start", { caseId, language }),
  simMessage: (id: string, message: string) => post<{ reply: string }>(`/simulation/${id}/message`, { message }),
  simSubmit: (
    id: string,
    body: { historySummary: string; diagnosis: string; differentials: string[]; reasoning?: string },
  ) =>
    post<{
      feedback: Feedback;
      reveal: { diagnosis: string; differentials: string[]; learningPoints: string[] };
      disclaimer: string;
    }>(`/simulation/${id}/submit`, body),
  startTriage: (language: Language, consent: boolean) =>
    post<{ sessionId: string; disclaimer: string; message: string }>("/triage/start", { language, consent }),
  triageMessage: (id: string, message: string) =>
    post<{ emergency: boolean; message: string }>(`/triage/${id}/message`, { message }),
  triageRecord: (id: string) =>
    post<{ record: PatientRecord; status: string; notice: string }>(`/triage/${id}/record`, {}),
};
