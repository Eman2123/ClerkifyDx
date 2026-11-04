import { db } from "./db.js";
import { newId } from "./store.js";

export type ConsultStatus = "requested" | "accepted" | "declined" | "completed" | "cancelled";

type ProfileRow = { user_id: string; mdcn_number: string; specialty: string; bio: string; status: "pending" | "verified" | "rejected"; name?: string };

export const profiles = {
  upsert(userId: string, mdcn: string, specialty: string, bio: string) {
    db.prepare(
      `INSERT INTO doctor_profiles (user_id,mdcn_number,specialty,bio,status,created_at) VALUES (?,?,?,?, 'pending', ?)
       ON CONFLICT(user_id) DO UPDATE SET mdcn_number=excluded.mdcn_number, specialty=excluded.specialty, bio=excluded.bio, status='pending', reviewed_at=NULL`,
    ).run(userId, mdcn, specialty, bio, Date.now());
    db.prepare("UPDATE users SET verified = 0 WHERE id = ?").run(userId);
  },
  get(userId: string) {
    return db.prepare("SELECT * FROM doctor_profiles WHERE user_id = ?").get(userId) as ProfileRow | undefined;
  },
  listByStatus(status: string) {
    return db
      .prepare("SELECT p.*, u.name, u.email FROM doctor_profiles p JOIN users u ON u.id = p.user_id WHERE p.status = ? ORDER BY p.created_at")
      .all(status) as (ProfileRow & { email: string })[];
  },
  review(userId: string, approve: boolean) {
    const status = approve ? "verified" : "rejected";
    const r = db.prepare("UPDATE doctor_profiles SET status = ?, reviewed_at = ? WHERE user_id = ?").run(status, Date.now(), userId);
    if (!r.changes) return false;
    db.prepare("UPDATE users SET verified = ? WHERE id = ?").run(approve ? 1 : 0, userId);
    return true;
  },
  /** Public directory: verified doctors only, no contact details. */
  directory(specialty?: string) {
    const rows = db
      .prepare("SELECT p.user_id AS id, u.name, p.specialty, p.bio FROM doctor_profiles p JOIN users u ON u.id = p.user_id WHERE p.status = 'verified' AND u.verified = 1")
      .all() as { id: string; name: string; specialty: string; bio: string }[];
    return specialty ? rows.filter((r) => r.specialty.toLowerCase().includes(specialty.toLowerCase())) : rows;
  },
};

type ConsRow = {
  id: string; patient_id: string; doctor_id: string; triage_session_id: string; reason: string;
  status: ConsultStatus; doctor_note: string | null; created_at: number; updated_at: number;
};

export const consultations = {
  create(patientId: string, doctorId: string, triageSessionId: string, reason: string) {
    const id = newId();
    const now = Date.now();
    db.prepare("INSERT INTO consultations (id,patient_id,doctor_id,triage_session_id,reason,created_at,updated_at) VALUES (?,?,?,?,?,?,?)").run(
      id, patientId, doctorId, triageSessionId, reason, now, now,
    );
    return id;
  },
  get(id: string) {
    return db.prepare("SELECT * FROM consultations WHERE id = ?").get(id) as ConsRow | undefined;
  },
  duplicateOpen(patientId: string, doctorId: string, triageSessionId: string) {
    return !!db
      .prepare("SELECT 1 FROM consultations WHERE patient_id=? AND doctor_id=? AND triage_session_id=? AND status IN ('requested','accepted')")
      .get(patientId, doctorId, triageSessionId);
  },
  forPatient(patientId: string) {
    return db
      .prepare("SELECT c.*, u.name AS doctor_name, p.specialty FROM consultations c JOIN users u ON u.id=c.doctor_id LEFT JOIN doctor_profiles p ON p.user_id=c.doctor_id WHERE c.patient_id=? ORDER BY c.created_at DESC")
      .all(patientId) as (ConsRow & { doctor_name: string; specialty: string | null })[];
  },
  forDoctor(doctorId: string) {
    return db
      .prepare("SELECT c.*, u.name AS patient_name FROM consultations c JOIN users u ON u.id=c.patient_id WHERE c.doctor_id=? ORDER BY c.created_at DESC")
      .all(doctorId) as (ConsRow & { patient_name: string })[];
  },
  /** Only valid transitions are allowed; statuses never advance on assumption. */
  transition(id: string, from: ConsultStatus[], to: ConsultStatus, note?: string) {
    const r = db
      .prepare(`UPDATE consultations SET status = ?, doctor_note = COALESCE(?, doctor_note), updated_at = ? WHERE id = ? AND status IN (${from.map(() => "?").join(",")})`)
      .run(to, note ?? null, Date.now(), id, ...from);
    return r.changes > 0;
  },
};
