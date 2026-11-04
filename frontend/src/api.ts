export type Language = "en" | "pcm";
export type Difficulty = "simple" | "intermediate" | "complex";

export interface CaseSummary {
  id: string;
  department: string;
  difficulty: Difficulty;
  title: string;
  presentation: string;
  image?: { url: string; modality: string; alt: string; credit: string };
}

export interface ImageReading {
  rating: "good" | "partial" | "needs_work";
  correct: string[];
  missed: string[];
  teachingPoint: string;
  imageMismatch: boolean;
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

export type Role = "student" | "intern" | "patient" | "doctor" | "admin";
export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  verified: boolean;
}

/** Backend origin. Empty in local dev (Vite proxies /api); set VITE_API_URL for a separate backend (e.g. Render). */
const API_BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(/\/$/, "");
export const apiUrl = (path: string) => `${API_BASE}${path}`;

const TOKEN_KEY = "clerkifydx_token";
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(apiUrl(`/api${path}`), {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error ?? `Request failed (${res.status})`, res.status);
  return data as T;
}

const post = <T,>(path: string, body: unknown) =>
  request<T>(path, { method: "POST", body: JSON.stringify(body) });

export interface LearningHistory {
  totals: { started: number; completed: number };
  recurringOmissions: { item: string; count: number }[];
  sessions: {
    id: string;
    title: string;
    department?: string;
    difficulty?: Difficulty;
    submitted: boolean;
    diagnosisAssessment: string | null;
    createdAt: number;
  }[];
}

export type ConsultStatus = "requested" | "accepted" | "declined" | "completed" | "cancelled";
export interface Consultation {
  id: string;
  status: ConsultStatus;
  reason: string;
  doctorNote: string | null;
  createdAt: number;
  doctorName?: string;
  specialty?: string | null;
  patientName?: string;
}
export interface ChatMessageView { id: string; mine: boolean; from: "doctor" | "patient"; body: string; createdAt: number }
export interface DoctorEntry { id: string; name: string; specialty: string; bio: string }
export interface PendingDoctor { user_id: string; name: string; email: string; mdcn_number: string; specialty: string; bio: string; status: string }

export const api = {
  doctorProfile: () => request<{ profile: { status: string; specialty: string; mdcn_number: string } | null }>("/doctor/profile"),
  saveDoctorProfile: (b: { mdcnNumber: string; specialty: string; bio: string }) =>
    post<{ status: string; notice: string }>("/doctor/profile", b),
  adminDoctors: (status = "pending") => request<{ doctors: PendingDoctor[] }>(`/admin/doctors?status=${status}`),
  reviewDoctor: (userId: string, approve: boolean) => post<{ ok: boolean }>(`/admin/doctors/${userId}/review`, { approve }),
  doctors: () => request<{ doctors: DoctorEntry[] }>("/doctors"),
  requestConsult: (b: { doctorId: string; triageSessionId: string; reason: string; shareSummary: boolean }) =>
    post<{ id: string; status: string; notice: string }>("/consultations", b),
  consultations: () => request<{ consultations: Consultation[] }>("/consultations"),
  consultation: (id: string) =>
    request<Consultation & { record: PatientRecord | null; recordShared: boolean; notice: string }>(`/consultations/${id}`),
  respondConsult: (id: string, action: "accept" | "decline" | "complete", note?: string) =>
    post<{ status: ConsultStatus }>(`/consultations/${id}/respond`, { action, note }),
  consultMessages: (id: string) => request<{ status: ConsultStatus; messages: ChatMessageView[] }>(`/consultations/${id}/messages`),
  sendConsultMessage: (id: string, body: string) =>
    post<{ messages: ChatMessageView[]; emergencyNotice?: string }>(`/consultations/${id}/messages`, { body }),
  cancelConsult: (id: string) => post<{ status: string }>(`/consultations/${id}/cancel`, {}),
  register: (b: { email: string; password: string; name: string; role: Exclude<Role, "admin"> }) =>
    post<{ user: User; token: string }>("/auth/register", b),
  login: (email: string, password: string) => post<{ user: User; token: string }>("/auth/login", { email, password }),
  me: () => request<{ user: User }>("/auth/me"),
  learning: () => request<LearningHistory>("/me/learning"),
  records: () =>
    request<{ records: { id: string; createdAt: number; emergency: boolean; record: PatientRecord | null }[] }>("/me/records"),
  health: () => request<{ ok: boolean; model: string; mockLlm: boolean; demo?: boolean }>("/health"),
  readImage: (id: string, interpretation: string) =>
    post<{ reading: ImageReading; disclaimer: string }>(`/simulation/${id}/image-read`, { interpretation }),
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
