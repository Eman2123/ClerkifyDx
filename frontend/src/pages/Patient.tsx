import { useEffect, useRef, useState } from "react";
import { api, type Language, type PatientRecord, type User } from "../api";
import { FindDoctor } from "./Consult";
import { tr } from "../i18n";
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
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [msgs]);

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
        <h2>{tr(language, "intake_title")}</h2>
        <p>{tr(language, "intake_intro")}</p>
        <ul className="assure">
          <li><Check /><span>{tr(language, "assure1")}</span></li>
          <li><Check /><span>{tr(language, "assure2")}</span></li>
          <li><Check /><span>{tr(language, "assure3")}</span></li>
        </ul>
        <label className="check">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          {tr(language, "consent")}
        </label>
        <button className="big" onClick={start} disabled={!consent}>{tr(language, "start")}</button>
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
          placeholder={tr(language, "placeholder")}
        />
        <button onClick={send} disabled={busy}>{tr(language, "send")}</button>
        <button className="secondary" onClick={finish} disabled={busy || msgs.length < 3}>{tr(language, "finish")}</button>
      </div>
      {error && <p className="error">{error}</p>}
      {record && (
        <div className="feedback">
          <h3>{tr(language, "summary")}</h3>
          <p><b>{tr(language, "complaint")}:</b> {record.record.presentingComplaint}</p>
          <p><b>{tr(language, "history")}:</b> {record.record.historyOfComplaint}</p>
          <p><b>{tr(language, "associated")}:</b> {record.record.associatedSymptoms.join(", ") || tr(language, "none")}</p>
          <p><b>{tr(language, "pmh")}:</b> {record.record.pastMedicalHistory}</p>
          <p><b>{tr(language, "meds")}:</b> {record.record.medications}</p>
          <p><b>{tr(language, "allergies")}:</b> {record.record.allergies}</p>
          <p><b>{tr(language, "unknown")}:</b> {record.record.unknown.join(", ") || "-"}</p>
          <p><b>{tr(language, "urgency")}:</b> {record.record.suggestedUrgency.replace(/_/g, " ")}</p>
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
