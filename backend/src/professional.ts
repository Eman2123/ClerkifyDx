import { exec, query, queryOne, withTx } from "./db.js";
import { newId } from "./store.js";

export type ConsultStatus = "requested" | "accepted" | "declined" | "completed" | "cancelled";

type ProfileRow = { user_id: string; mdcn_number: string; specialty: string; bio: string; status: "pending" | "verified" | "rejected"; name?: string };

export const profiles = {
  async upsert(userId: string, mdcn: string, specialty: string, bio: string): Promise<void> {
    await withTx(async (q) => {
      await q(
        `INSERT INTO doctor_profiles (user_id,mdcn_number,specialty,bio,status,created_at) VALUES ($1,$2,$3,$4,'pending',$5)
         ON CONFLICT (user_id) DO UPDATE SET mdcn_number=EXCLUDED.mdcn_number, specialty=EXCLUDED.specialty, bio=EXCLUDED.bio, status='pending', reviewed_at=NULL`,
        [userId, mdcn, specialty, bio, Date.now()],
      );
      await q("UPDATE users SET verified = 0 WHERE id = $1", [userId]);
    });
  },
  async get(userId: string): Promise<ProfileRow | undefined> {
    return queryOne<ProfileRow>("SELECT * FROM doctor_profiles WHERE user_id = $1", [userId]);
  },
  async listByStatus(status: string): Promise<(ProfileRow & { email: string })[]> {
    return query<ProfileRow & { email: string }>(
      "SELECT p.*, u.name, u.email FROM doctor_profiles p JOIN users u ON u.id = p.user_id WHERE p.status = $1 ORDER BY p.created_at",
      [status],
    );
  },
  async review(userId: string, approve: boolean): Promise<boolean> {
    const status = approve ? "verified" : "rejected";
    return withTx(async (q) => {
      const r = await q("UPDATE doctor_profiles SET status = $1, reviewed_at = $2 WHERE user_id = $3", [status, Date.now(), userId]);
      if (!r.rowCount) return false;
      await q("UPDATE users SET verified = $1 WHERE id = $2", [approve ? 1 : 0, userId]);
      return true;
    });
  },
  /** Public directory: verified doctors only, no contact details. */
  async directory(specialty?: string): Promise<{ id: string; name: string; specialty: string; bio: string }[]> {
    const rows = await query<{ id: string; name: string; specialty: string; bio: string }>(
      "SELECT p.user_id AS id, u.name, p.specialty, p.bio FROM doctor_profiles p JOIN users u ON u.id = p.user_id WHERE p.status = 'verified' AND u.verified = 1",
    );
    return specialty ? rows.filter((r) => r.specialty.toLowerCase().includes(specialty.toLowerCase())) : rows;
  },
};

export type ConsRow = {
  id: string; patient_id: string; doctor_id: string; triage_session_id: string; reason: string;
  status: ConsultStatus; doctor_note: string | null; created_at: number; updated_at: number;
};

export const consultations = {
  async create(patientId: string, doctorId: string, triageSessionId: string, reason: string): Promise<string> {
    const id = newId();
    const now = Date.now();
    await exec(
      "INSERT INTO consultations (id,patient_id,doctor_id,triage_session_id,reason,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [id, patientId, doctorId, triageSessionId, reason, now, now],
    );
    return id;
  },
  async get(id: string): Promise<ConsRow | undefined> {
    return queryOne<ConsRow>("SELECT * FROM consultations WHERE id = $1", [id]);
  },
  async duplicateOpen(patientId: string, doctorId: string, triageSessionId: string): Promise<boolean> {
    const r = await queryOne(
      "SELECT 1 AS x FROM consultations WHERE patient_id=$1 AND doctor_id=$2 AND triage_session_id=$3 AND status IN ('requested','accepted')",
      [patientId, doctorId, triageSessionId],
    );
    return !!r;
  },
  async forPatient(patientId: string): Promise<(ConsRow & { doctor_name: string; specialty: string | null })[]> {
    return query(
      "SELECT c.*, u.name AS doctor_name, p.specialty FROM consultations c JOIN users u ON u.id=c.doctor_id LEFT JOIN doctor_profiles p ON p.user_id=c.doctor_id WHERE c.patient_id=$1 ORDER BY c.created_at DESC",
      [patientId],
    );
  },
  async forDoctor(doctorId: string): Promise<(ConsRow & { patient_name: string })[]> {
    return query(
      "SELECT c.*, u.name AS patient_name FROM consultations c JOIN users u ON u.id=c.patient_id WHERE c.doctor_id=$1 ORDER BY c.created_at DESC",
      [doctorId],
    );
  },
  /** Only valid transitions are allowed; statuses never advance on assumption. */
  async transition(id: string, from: ConsultStatus[], to: ConsultStatus, note?: string): Promise<boolean> {
    const n = await exec(
      "UPDATE consultations SET status = $1, doctor_note = COALESCE($2::text, doctor_note), updated_at = $3 WHERE id = $4 AND status = ANY($5::text[])",
      [to, note ?? null, Date.now(), id, from],
    );
    return n > 0;
  },
};

export const consultMessages = {
  async list(consultationId: string, since = 0): Promise<{ id: string; sender_id: string; body: string; created_at: number }[]> {
    return query(
      "SELECT id, sender_id, body, created_at FROM consultation_messages WHERE consultation_id = $1 AND created_at > $2 ORDER BY created_at, seq",
      [consultationId, since],
    );
  },
  async add(consultationId: string, senderId: string, body: string) {
    const id = newId();
    const createdAt = Date.now();
    await exec("INSERT INTO consultation_messages (id,consultation_id,sender_id,body,created_at) VALUES ($1,$2,$3,$4,$5)", [id, consultationId, senderId, body, createdAt]);
    return { id, sender_id: senderId, body, created_at: createdAt };
  },
};
