import { useEffect, useState } from "react";
import { api, type PendingDoctor } from "../api";

export default function Admin() {
  const [list, setList] = useState<PendingDoctor[]>([]);
  const [error, setError] = useState("");
  const load = () => api.adminDoctors().then((r) => setList(r.doctors)).catch((e: Error) => setError(e.message));
  useEffect(() => { load(); }, []);

  async function review(id: string, approve: boolean) {
    try { await api.reviewDoctor(id, approve); await load(); } catch (e) { setError((e as Error).message); }
  }

  return (
    <section className="panel narrow">
      <h2>Doctor verification</h2>
      <p className="muted">Check each MDCN number against the official register before approving.</p>
      {error && <p className="error">{error}</p>}
      {list.length === 0 && <p className="muted">No pending doctors.</p>}
      <ul className="plain">
        {list.map((d) => (
          <li key={d.user_id}>
            <b>{d.name}</b> · {d.specialty}<br />
            <span className="muted">{d.email} · MDCN {d.mdcn_number}</span>
            {d.bio && <p>{d.bio}</p>}
            <div className="row">
              <button onClick={() => review(d.user_id, true)}>Approve</button>
              <button className="secondary" onClick={() => review(d.user_id, false)}>Reject</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
