import { useEffect, useRef, useState } from "react";
import { api, type ChatMessageView, type Consultation, type DoctorEntry } from "../api";

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
  const [chatId, setChatId] = useState<string | null>(null);
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
            {(c.status === "accepted" || c.status === "completed") && (
              <>
                <button className="secondary" onClick={() => setChatId(chatId === c.id ? null : c.id)}>{chatId === c.id ? "Hide chat" : "Open chat"}</button>
                {chatId === c.id && <ConsultChat id={c.id} status={c.status} />}
              </>
            )}
            {(c.status === "requested" || c.status === "accepted") && (
              <button className="secondary" onClick={() => api.cancelConsult(c.id).then(load)}>Cancel</button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Simple polling chat for an accepted consultation. Read-only once completed. Not an emergency channel. */
export function ConsultChat({ id, status }: { id: string; status: string }) {
  const [msgs, setMsgs] = useState<ChatMessageView[]>([]);
  const [text, setText] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const load = () => api.consultMessages(id).then((r) => alive && setMsgs(r.messages)).catch((e: Error) => alive && setError(e.message));
    load();
    const t = status === "accepted" ? setInterval(load, 4000) : undefined;
    return () => { alive = false; if (t) clearInterval(t); };
  }, [id, status]);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [msgs.length]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setText(""); setError("");
    try {
      const r = await api.sendConsultMessage(id, body);
      setMsgs(r.messages);
      setNotice(r.emergencyNotice ?? "");
    } catch (e) { setError((e as Error).message); setText(body); }
  }

  return (
    <div className="feedback">
      <p className="muted">Chat is for non-urgent follow-up only. In an emergency, go to the nearest hospital.</p>
      <div className="chat">
        {msgs.length === 0 && <p className="muted">No messages yet.</p>}
        {msgs.map((m) => <div key={m.id} className={`bubble ${m.mine ? "you" : "patient"}`}>{m.body}</div>)}
        <div ref={endRef} />
      </div>
      {notice && <p className="error"><b>{notice}</b></p>}
      {status === "accepted" ? (
        <div className="row">
          <input value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Write a message" />
          <button onClick={send} disabled={!text.trim()}>Send</button>
        </div>
      ) : <p className="muted">This consultation is completed. The chat is read-only.</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
