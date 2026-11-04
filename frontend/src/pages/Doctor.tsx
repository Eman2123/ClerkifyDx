import { useEffect, useState } from "react";
import { api, type Consultation, type PatientRecord, type User } from "../api";
import { ConsultChat } from "./Consult";
import { initials } from "../ui";

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
  useEffect(() => { load(); }, [user.verified]);

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
    const step = profile?.status === "pending" ? 1 : 0;
    return (
      <section className="two-col">
        <div className="panel">
          <h2>Get verified</h2>
          <p className="muted">An administrator checks your registration before you are listed to patients.</p>
          <ol className="stepper">
            {["Submit your details", "Admin reviews your MDCN number", "You are verified and listed"].map((s, n) => (
              <li key={s} className={n < step ? "done" : n === step ? "now" : ""}>{s}</li>
            ))}
          </ol>
          {profile?.status === "rejected" && <p className="error">Your last submission was rejected. Check your details and submit again.</p>}
          {profile?.status === "pending" && <p className="muted">Submitted. You can resubmit to update your details.</p>}
        </div>
        <form className="panel" onSubmit={saveProfile}>
          <h3>Professional details</h3>
          <label>MDCN registration number<input required value={form.mdcnNumber} onChange={(e) => setForm({ ...form, mdcnNumber: e.target.value })} /></label>
          <label>Specialty<input required value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} /></label>
          <label>Short bio<textarea rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></label>
          <button className="big">{profile ? "Resubmit for verification" : "Submit for verification"}</button>
          {msg && <p className="muted">{msg}</p>}
          {error && <p className="error">{error}</p>}
        </form>
      </section>
    );
  }

  const count = (s: string) => list.filter((c) => c.status === s).length;
  const rec = open?.shared ? open.record : null;
  return (
    <section>
      <div className="page-head"><h2>Consultation requests</h2><p className="muted">Review the patient summary only after you accept a request. Chat is for non-urgent follow-up.</p></div>
      <div className="stats">
        <div className="stat"><b>{count("requested")}</b><span>Waiting for you</span></div>
        <div className="stat"><b>{count("accepted")}</b><span>In progress</span></div>
        <div className="stat"><b>{count("completed")}</b><span>Completed</span></div>
      </div>
      {error && <p className="error">{error}</p>}
      {list.length === 0 && <div className="empty"><b>No requests yet</b><span>When a patient requests you, it will appear here.</span></div>}
      <div className={rec ? "two-col" : ""}>
        <div className="reqs">
          {list.map((c) => (
            <article key={c.id} className={`req ${open?.id === c.id ? "sel" : ""}`}>
              <header>
                <span className="avatar">{initials(c.patientName ?? "P")}</span>
                <div><b>{c.patientName}</b>{c.reason && <p className="muted">{c.reason}</p>}</div>
                <span className={`tag ${c.status}`}>{c.status}</span>
              </header>
              <div className="row">
                {c.status === "requested" && (<><button onClick={() => respond(c.id, "accept")}>Accept</button><button className="secondary" onClick={() => respond(c.id, "decline")}>Decline</button></>)}
                {c.status === "accepted" && <button onClick={() => respond(c.id, "complete")}>Mark completed</button>}
                {(c.status === "accepted" || c.status === "completed") && (<>
                  <button className="secondary" onClick={() => view(c.id)}>View summary</button>
                  <button className="secondary" onClick={() => setChatId(chatId === c.id ? null : c.id)}>{chatId === c.id ? "Hide chat" : "Open chat"}</button>
                </>)}
              </div>
              {chatId === c.id && <ConsultChat id={c.id} status={c.status} />}
            </article>
          ))}
        </div>
        {rec && (
          <aside className="panel record">
            <h3>Patient summary</h3>
            <p className="muted">AI-generated from the patient intake. Verify everything with the patient.</p>
            <dl>
              <div><dt>Complaint</dt><dd>{rec.presentingComplaint}</dd></div>
              <div><dt>History</dt><dd>{rec.historyOfComplaint}</dd></div>
              <div><dt>Associated symptoms</dt><dd>{rec.associatedSymptoms.join(", ") || "none reported"}</dd></div>
              <div><dt>Past medical history</dt><dd>{rec.pastMedicalHistory}</dd></div>
              <div><dt>Medications</dt><dd>{rec.medications}</dd></div>
              <div><dt>Allergies</dt><dd>{rec.allergies}</dd></div>
              <div><dt>Not yet known</dt><dd>{rec.unknown.join(", ") || "-"}</dd></div>
            </dl>
          </aside>
        )}
      </div>
    </section>
  );
}
