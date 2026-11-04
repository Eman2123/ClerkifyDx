import { useEffect, useState } from "react";
import { api, type PendingDoctor } from "../api";
import { initials } from "../ui";

type St = "pending" | "verified" | "rejected";
const TABS: { id: St; label: string }[] = [
  { id: "pending", label: "Waiting for review" },
  { id: "verified", label: "Verified" },
  { id: "rejected", label: "Rejected" },
];

export default function Admin() {
  const [status, setStatus] = useState<St>("pending");
  const [list, setList] = useState<PendingDoctor[] | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const load = (s: St = status) => api.adminDoctors(s).then((r) => setList(r.doctors)).catch((e: Error) => setError(e.message));
  useEffect(() => { setList(null); load(status); }, [status]);

  async function review(id: string, approve: boolean) {
    setBusyId(id); setError("");
    try { await api.reviewDoctor(id, approve); await load(); } catch (e) { setError((e as Error).message); }
    finally { setBusyId(""); }
  }

  return (
    <section>
      <div className="page-head">
        <h2>Doctor verification</h2>
        <p className="muted">Only verified doctors are listed to patients. Check each MDCN number against the official register before you approve.</p>
      </div>
      <div className="seg" role="tablist" aria-label="Verification status">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={status === t.id} className={status === t.id ? "on" : ""} onClick={() => setStatus(t.id)}>{t.label}</button>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      {list === null && <p className="muted">Loading...</p>}
      {list?.length === 0 && (
        <div className="empty"><b>{status === "pending" ? "Nothing waiting for review" : `No ${status} doctors yet`}</b><span>{status === "pending" ? "New doctor sign-ups will appear here." : "They will show up here after you review a request."}</span></div>
      )}
      <div className="grid">
        {list?.map((d) => (
          <article key={d.user_id} className="dcard">
            <header>
              <span className="avatar">{initials(d.name)}</span>
              <div><b>{d.name}</b><span className="muted">{d.email}</span></div>
            </header>
            <dl>
              <div><dt>Specialty</dt><dd>{d.specialty}</dd></div>
              <div><dt>MDCN number</dt><dd>{d.mdcn_number}</dd></div>
            </dl>
            {d.bio && <p className="muted">{d.bio}</p>}
            <div className="row">
              {status !== "verified" && <button disabled={busyId === d.user_id} onClick={() => review(d.user_id, true)}>Approve</button>}
              {status !== "rejected" && <button className="secondary" disabled={busyId === d.user_id} onClick={() => review(d.user_id, false)}>{status === "verified" ? "Revoke" : "Reject"}</button>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
