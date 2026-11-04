import { useEffect, useState } from "react";
import { api, type Consultation, type DoctorEntry } from "../api";

/** Find a verified doctor and request a consultation using a finished intake summary. */
export function FindDoctor({ triageSessionId }: { triageSessionId: string }) {
  const [docs, setDocs] = useState<DoctorEntry[]>([]);
  const [share, setShare] = useState(false);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { api.doctors().then((r) => setDocs(r.doctors)).catch((e: Error) => setError(e.message)); }, []);

  async function request(doctorId: string) {
    setError(""); setMsg("");
    try { setMsg((await api.requestConsult({ doctorId, triageSessionId, reason, shareSummary: share })).notice); }
    catch (e) { setError((e as Error).message); }
  }

  return (
    <div className="feedback">
      <h3>Talk to a doctor</h3>
      {docs.length === 0 && <p className="muted">No verified doctors are available yet. If this is urgent, go to a hospital.</p>}
      <label>Reason (optional)<input value={reason} onChange={(e) => setReason(e.target.value)} /></label>
      <label className="check">
        <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} />
        I agree to share my intake summary with the doctor I choose, if they accept.
      </label>
      <ul className="plain">
        {docs.map((d) => (
          <li key={d.id}>
            <b>{d.name}</b> · {d.specialty}
            {d.bio && <p className="muted">{d.bio}</p>}
            <button disabled={!share} onClick={() => request(d.id)}>Request consultation</button>
          </li>
        ))}
      </ul>
      {msg && <p>{msg}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export function MyConsultations() {
  const [list, setList] = useState<Consultation[]>([]);
  const [error, setError] = useState("");
  const load = () => api.consultations().then((r) => setList(r.consultations)).catch((e: Error) => setError(e.message));
  useEffect(() => { load(); }, []);

  return (
    <section className="panel narrow">
      <h2>My consultations</h2>
      {error && <p className="error">{error}</p>}
      {list.length === 0 && <p className="muted">No consultations yet.</p>}
      <ul className="plain">
        {list.map((c) => (
          <li key={c.id}>
            <b>{c.doctorName}</b> {c.specialty && <span className="muted">· {c.specialty}</span>} <span className={`tag ${c.status}`}>{c.status}</span>
            {c.status === "requested" && <p className="muted">Waiting for the doctor. No doctor has reviewed your case yet.</p>}
            {c.doctorNote && <p><b>Doctor's note:</b> {c.doctorNote}</p>}
            {(c.status === "requested" || c.status === "accepted") && (
              <button className="secondary" onClick={() => api.cancelConsult(c.id).then(load)}>Cancel</button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
