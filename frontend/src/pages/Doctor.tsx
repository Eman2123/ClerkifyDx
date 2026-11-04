import { useEffect, useState } from "react";
import { api, type Consultation, type PatientRecord, type User } from "../api";
import { ConsultChat } from "./Consult";

export default function Doctor({ user }: { user: User }) {
  const [profile, setProfile] = useState<{ status: string } | null | undefined>(undefined);
  const [form, setForm] = useState({ mdcnNumber: "", specialty: "", bio: "" });
  const [list, setList] = useState<Consultation[]>([]);
  const [open, setOpen] = useState<{ id: string; record: PatientRecord | null; shared: boolean } | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const load = () => {
    api.doctorProfile().then((r) => setProfile(r.profile)).catch((e: Error) => setError(e.message));
    if (user.verified) api.consultations().then((r) => setList(r.consultations)).catch((e: Error) => setError(e.message));
  };
  useEffect(load, [user.verified]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    try { setMsg((await api.saveDoctorProfile(form)).notice); load(); } catch (err) { setError((err as Error).message); }
  }
  async function respond(id: string, action: "accept" | "decline" | "complete") {
    try { await api.respondConsult(id, action); await view(id); load(); } catch (e) { setError((e as Error).message); }
  }
  async function view(id: string) {
    const c = await api.consultation(id);
    setOpen({ id, record: c.record, shared: c.recordShared });
  }

  if (!user.verified) {
    return (
      <form className="panel narrow" onSubmit={saveProfile}>
        <h2>Professional verification</h2>
        <p className="muted">
          {profile ? `Status: ${profile.status}. You can resubmit to update your details.` : "Submit your details. An administrator checks your registration before you are listed."}
        </p>
        <label>MDCN registration number<input required value={form.mdcnNumber} onChange={(e) => setForm({ ...form, mdcnNumber: e.target.value })} /></label>
        <label>Specialty<input required value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} /></label>
        <label>Short bio<textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></label>
        <button>Submit for verification</button>
        {msg && <p className="muted">{msg}</p>}
        {error && <p className="error">{error}</p>}
      </form>
    );
  }

  return (
    <section className="panel narrow">
      <h2>Consultation requests</h2>
      {error && <p className="error">{error}</p>}
      {list.length === 0 && <p className="muted">No requests yet.</p>}
      <ul className="plain">
        {list.map((c) => (
          <li key={c.id}>
            <b>{c.patientName}</b> <span className={`tag ${c.status}`}>{c.status}</span>
            {c.reason && <p>{c.reason}</p>}
            <div className="row">
              {c.status === "requested" && (
                <>
                  <button onClick={() => respond(c.id, "accept")}>Accept</button>
                  <button className="secondary" onClick={() => respond(c.id, "decline")}>Decline</button>
                </>
              )}
              {c.status === "accepted" && <button onClick={() => respond(c.id, "complete")}>Mark completed</button>}
              {(c.status === "accepted" || c.status === "completed") && (
                <button className="secondary" onClick={() => view(c.id)}>View summary</button>
              )}
              {(c.status === "accepted" || c.status === "completed") && (
                <button className="secondary" onClick={() => setChatId(chatId === c.id ? null : c.id)}>{chatId === c.id ? "Hide chat" : "Open chat"}</button>
              )}
            </div>
            {chatId === c.id && <ConsultChat id={c.id} status={c.status} />}
          </li>
        ))}
      </ul>
      {open?.shared && open.record && (
        <div className="feedback">
          <h3>Patient summary (AI-generated, verify with patient)</h3>
          <p><b>Complaint:</b> {open.record.presentingComplaint}</p>
          <p><b>History:</b> {open.record.historyOfComplaint}</p>
          <p><b>Associated:</b> {open.record.associatedSymptoms.join(", ") || "none reported"}</p>
          <p><b>PMH:</b> {open.record.pastMedicalHistory}</p>
          <p><b>Medications:</b> {open.record.medications} · <b>Allergies:</b> {open.record.allergies}</p>
          <p><b>Unknown:</b> {open.record.unknown.join(", ") || "-"}</p>
        </div>
      )}
    </section>
  );
}
