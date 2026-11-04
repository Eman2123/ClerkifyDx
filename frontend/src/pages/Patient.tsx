import { useEffect, useRef, useState } from "react";
import { api, type Language, type PatientRecord, type User } from "../api";
import { FindDoctor } from "./Consult";
import { Check } from "../ui";

interface Msg {
  from: "you" | "ai";
  text: string;
  emergency?: boolean;
}

export default function Patient({ language, user }: { language: Language; user: User | null }) {
  const [consent, setConsent] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [disclaimer, setDisclaimer] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [record, setRecord] = useState<{ record: PatientRecord; notice: string } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [msgs]);

  async function start() {
    setError("");
    try {
      const s = await api.startTriage(language, consent);
      setSessionId(s.sessionId);
      setDisclaimer(s.disclaimer);
      setMsgs([{ from: "ai", text: s.message }]);
      setRecord(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function send() {
    if (!sessionId || !input.trim() || busy) return;
    const text = input.trim();
    setInput("");
    setMsgs((m) => [...m, { from: "you", text }]);
    setBusy(true);
    try {
      const r = await api.triageMessage(sessionId, text);
      setMsgs((m) => [...m, { from: "ai", text: r.message, emergency: r.emergency }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (!sessionId) return;
    setBusy(true);
    try {
      setRecord(await api.triageRecord(sessionId));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!sessionId) {
    return (
      <section className="panel narrow">
        <h2>Tell us what is wrong</h2>
        <p>An AI assistant asks about your symptoms one question at a time and organises your answers for a qualified doctor.</p>
        <ul className="assure">
          <li><Check /><span>It cannot diagnose you and cannot call an ambulance.</span></li>
          <li><Check /><span>Emergency warning signs are checked first, before any AI reply.</span></li>
          <li><Check /><span>A doctor sees your summary only if you choose to share it and they accept.</span></li>
        </ul>
        <label className="check">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          I understand and consent to my information being processed for this purpose.
        </label>
        <button className="big" onClick={start} disabled={!consent}>Start intake</button>
        {error && <p className="error">{error}</p>}
      </section>
    );
  }

  return (
    <section className="panel narrow">
      <p className="muted">{disclaimer}</p>
      <div className="chat">
        {msgs.map((m, i) => (
          <div key={i} className={`bubble ${m.from === "you" ? "you" : "patient"} ${m.emergency ? "emergency" : ""}`}>
            {m.text}
          </div>
        ))}
        {busy && <div className="bubble patient">...</div>}
        <div ref={endRef} />
      </div>
      <div className="row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type here"
        />
        <button onClick={send} disabled={busy}>Send</button>
        <button className="secondary" onClick={finish} disabled={busy || msgs.length < 3}>Finish</button>
      </div>
      {error && <p className="error">{error}</p>}
      {record && (
        <div className="feedback">
          <h3>Summary for clinician</h3>
          <p><b>Complaint:</b> {record.record.presentingComplaint}</p>
          <p><b>History:</b> {record.record.historyOfComplaint}</p>
          <p><b>Associated symptoms:</b> {record.record.associatedSymptoms.join(", ") || "none reported"}</p>
          <p><b>Past history:</b> {record.record.pastMedicalHistory}</p>
          <p><b>Medications:</b> {record.record.medications}</p>
          <p><b>Allergies:</b> {record.record.allergies}</p>
          <p><b>Unknown:</b> {record.record.unknown.join(", ") || "-"}</p>
          <p><b>Preliminary urgency:</b> {record.record.suggestedUrgency.replace(/_/g, " ")}</p>
          <p className="muted">{record.notice}</p>
          {user?.role === "patient" && record.record.suggestedUrgency !== "emergency_now" && sessionId && (
            <FindDoctor triageSessionId={sessionId} />
          )}
          {!user && <p className="muted">Create a patient account to request a doctor consultation.</p>}
        </div>
      )}
    </section>
  );
}
