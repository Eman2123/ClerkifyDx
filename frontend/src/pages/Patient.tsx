import { useEffect, useRef, useState } from "react";
import { api, type Language, type PatientRecord } from "../api";

interface Msg {
  from: "you" | "ai";
  text: string;
  emergency?: boolean;
}

export default function Patient({ language }: { language: Language }) {
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
        <h2>Patient intake</h2>
        <p>
          This AI assistant asks about your symptoms and organises them for a qualified doctor. It cannot diagnose you
          and cannot call an ambulance. Connection to doctors is still under development.
        </p>
        <label className="check">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          I understand and consent to my information being processed for this purpose.
        </label>
        <button onClick={start} disabled={!consent}>Start</button>
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
        </div>
      )}
    </section>
  );
}
