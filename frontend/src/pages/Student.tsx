import { useEffect, useRef, useState } from "react";
import { api, type CaseSummary, type Feedback, type Language } from "../api";

interface Msg {
  from: "you" | "patient";
  text: string;
}

export default function Student({ language }: { language: Language }) {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [error, setError] = useState("");
  const [session, setSession] = useState<{ id: string; c: CaseSummary } | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ historySummary: "", diagnosis: "", differentials: "", reasoning: "" });
  const [result, setResult] = useState<{
    feedback: Feedback;
    reveal: { diagnosis: string; differentials: string[]; learningPoints: string[] };
    disclaimer: string;
  } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.cases().then((d) => setCases(d.cases)).catch((e: Error) => setError(e.message));
  }, []);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [msgs]);

  async function start(c: CaseSummary) {
    setError("");
    try {
      const s = await api.startSim(c.id, language);
      setSession({ id: s.sessionId, c: s.case });
      setMsgs([{ from: "patient", text: s.case.presentation }]);
      setResult(null);
      setForm({ historySummary: "", diagnosis: "", differentials: "", reasoning: "" });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function send() {
    if (!session || !input.trim() || busy) return;
    const text = input.trim();
    setInput("");
    setMsgs((m) => [...m, { from: "you", text }]);
    setBusy(true);
    try {
      const r = await api.simMessage(session.id, text);
      setMsgs((m) => [...m, { from: "patient", text: r.reply }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!session || busy) return;
    setBusy(true);
    setError("");
    try {
      setResult(
        await api.simSubmit(session.id, {
          historySummary: form.historySummary,
          diagnosis: form.diagnosis,
          differentials: form.differentials.split(",").map((s) => s.trim()).filter(Boolean),
          reasoning: form.reasoning || undefined,
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!session) {
    return (
      <section>
        <h2>Choose a case</h2>
        {error && <p className="error">{error}</p>}
        <div className="grid">
          {cases.map((c) => (
            <button key={c.id} className="card" onClick={() => start(c)}>
              <span className={`tag ${c.difficulty}`}>{c.difficulty}</span>
              <strong>{c.title}</strong>
              <small>{c.department}</small>
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="two-col">
      <div className="panel">
        <h2>{session.c.title}</h2>
        <p className="muted">Simulated patient, for education only. Ask questions to take a history.</p>
        <div className="chat">
          {msgs.map((m, i) => (
            <div key={i} className={`bubble ${m.from}`}>
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
            placeholder="Ask the patient a question"
          />
          <button onClick={send} disabled={busy}>Send</button>
        </div>
      </div>

      <div className="panel">
        <h2>Your clerking</h2>
        <label>History summary
          <textarea rows={5} value={form.historySummary} onChange={(e) => setForm({ ...form, historySummary: e.target.value })} />
        </label>
        <label>Leading diagnosis
          <input value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} />
        </label>
        <label>Differentials (comma separated)
          <input value={form.differentials} onChange={(e) => setForm({ ...form, differentials: e.target.value })} />
        </label>
        <label>Reasoning (optional)
          <textarea rows={3} value={form.reasoning} onChange={(e) => setForm({ ...form, reasoning: e.target.value })} />
        </label>
        <div className="row">
          <button onClick={submit} disabled={busy || !form.historySummary || !form.diagnosis}>Submit for feedback</button>
          <button className="secondary" onClick={() => setSession(null)}>New case</button>
        </div>
        {error && <p className="error">{error}</p>}

        {result && (
          <div className="feedback">
            <h3>Feedback</h3>
            <p>{result.feedback.overallSummary}</p>
            <p><b>Diagnosis:</b> {result.feedback.diagnosisAssessment.replace("_", " ")} (reference: {result.reveal.diagnosis})</p>
            <List title="Strengths" items={result.feedback.strengths} />
            {result.feedback.missed.length > 0 && (
              <>
                <h4>Missed</h4>
                <ul>{result.feedback.missed.map((m, i) => <li key={i}><b>{m.item}:</b> {m.whyItMatters}</li>)}</ul>
              </>
            )}
            <List title="Red flags missed" items={result.feedback.redFlagsMissed} />
            <p><b>Reasoning:</b> {result.feedback.reasoningFeedback}</p>
            <List title="How to improve" items={result.feedback.improvements} />
            <List title="Suggested study" items={result.feedback.suggestedStudy} />
            <List title="Learning points" items={result.reveal.learningPoints} />
            <p className="muted">{result.disclaimer}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <>
      <h4>{title}</h4>
      <ul>{items.map((s, i) => <li key={i}>{s}</li>)}</ul>
    </>
  );
}
