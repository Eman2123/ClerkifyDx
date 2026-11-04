import { useEffect, useRef, useState } from "react";
import { tr } from "../i18n";
import { api, apiUrl, type CaseSummary, type Feedback, type ImageReading, type Language } from "../api";

interface Msg {
  from: "you" | "patient";
  text: string;
}

export default function Student({ language }: { language: Language }) {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [dept, setDept] = useState("all");
  const [level, setLevel] = useState("all");
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
  const [imgText, setImgText] = useState("");
  const [imgReading, setImgReading] = useState<ImageReading | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .cases()
      .then((d) => setCases(d.cases))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoadingCases(false));
  }, []);
  useEffect(() => {
    // Block body on purpose: an effect must not return the scroll call's result.
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [msgs]);

  async function start(c: CaseSummary) {
    setError("");
    try {
      const s = await api.startSim(c.id, language);
      setSession({ id: s.sessionId, c: s.case });
      setMsgs([{ from: "patient", text: s.case.presentation }]);
      setResult(null);
      setImgText("");
      setImgReading(null);
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

  async function checkImage() {
    if (!session || !imgText.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await api.readImage(session.id, imgText.trim());
      setImgReading(r.reading);
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

  const visible = cases.filter((c) => (dept === "all" || c.department === dept) && (level === "all" || c.difficulty === level));

  if (!session) {
    const depts = ["all", ...new Set(cases.map((c) => c.department))];
    const levels = ["all", "simple", "intermediate", "complex"];
    return (
      <section>
        <div className="page-head"><h2>{tr(language, "choose_case")}</h2><p className="muted">{tr(language, "choose_sub")}</p></div>
        {error && <p className="error">{error}</p>}
        <div className="filterbar">
          <div className="chipset" role="group" aria-label="Department">
            {depts.map((d) => <button key={d} className="fchip" aria-pressed={dept === d} onClick={() => setDept(d)}>{d === "all" ? "All departments" : d}</button>)}
          </div>
          <div className="chipset" role="group" aria-label="Difficulty">
            {levels.map((l) => <button key={l} className="fchip" aria-pressed={level === l} onClick={() => setLevel(l)}>{l === "all" ? "All levels" : l}</button>)}
          </div>
        </div>
        {loadingCases && <p className="muted">Loading cases...</p>}
        {!loadingCases && visible.length === 0 && !error && <div className="empty"><b>No cases match these filters</b><span>Try another department or level.</span></div>}
        <div className="grid">
          {visible.map((c) => (
            <button key={c.id} className={`card ${c.difficulty}`} onClick={() => start(c)}>
              <span className="dept">{c.department}{c.image ? " · includes image" : ""}</span>
              <strong>{c.title}</strong>
              <span className="pres">{c.presentation}</span>
              <span className="card-foot">
                <span className="dots" aria-label={`Difficulty: ${c.difficulty}`}>
                  {["simple", "intermediate", "complex"].map((l, i) => <i key={l} className={i <= ["simple", "intermediate", "complex"].indexOf(c.difficulty) ? "on" : ""} />)}
                  &nbsp;{c.difficulty}
                </span>
                <span className="go">Start case →</span>
              </span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  const asked = msgs.filter((m) => m.from === "you").length;
  const L = language;
  const quick = [1, 2, 3, 4, 5, 6] as const;
  const dx = result?.feedback.diagnosisAssessment ?? "";
  const tone = /incorrect|wrong/i.test(dx) ? "bad" : /partial/i.test(dx) ? "mid" : "good";

  return (
    <section className="simwrap">
      <div className="sim-bar">
        <button className="secondary" onClick={() => setSession(null)}>← {tr(L, "back")}</button>
        <div className="sim-title"><h2>{session.c.title}</h2><span className="tag">{session.c.department}</span></div>
        <span className="asked"><b>{asked}</b> {tr(L, "asked")}</span>
      </div>

      <div className="sim">
        <div className="panel consult">
          <div className="pt-head">
            <span className="pt-av" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c1-5 5-7 8-7s7 2 8 7" /></svg></span>
            <div><b>Simulated patient</b><span className="muted">{tr(L, "sim_note")}</span></div>
          </div>
          <div className="cc"><small>{tr(L, "presenting")}</small>{session.c.presentation}</div>
          {session.c.image && (
            <div className="imgcase">
              <img src={apiUrl(session.c.image.url)} alt={session.c.image.alt} />
              <small className="muted">{session.c.image.modality}. {session.c.image.credit}</small>
              <textarea rows={3} value={imgText} onChange={(e) => setImgText(e.target.value)} placeholder="Describe what you see in the image, then say what it suggests" />
              <button className="secondary" onClick={checkImage} disabled={busy || imgText.trim().length < 3}>Check my image reading</button>
              {imgReading && (
                <div className="feedback">
                  {imgReading.imageMismatch && <p className="error">The AI thinks this image may not match the case reference. Treat this feedback with caution.</p>}
                  <p><b>Rating:</b> {imgReading.rating.replace("_", " ")}</p>
                  <List title="You got right" items={imgReading.correct} />
                  <List title="You missed" items={imgReading.missed} />
                  <p><b>Teaching point:</b> {imgReading.teachingPoint}</p>
                  <p className="muted">AI feedback is a learning aid and may contain errors.</p>
                </div>
              )}
            </div>
          )}
          <div className="chat" aria-live="polite">
            {msgs.slice(1).length === 0 && <p className="chat-hint">Start by asking an open question, then narrow down.</p>}
            {msgs.slice(1).map((m, i) => <div key={i} className={`bubble ${m.from}`}>{m.text}</div>)}
            {busy && <div className="bubble patient typing" aria-label="Patient is replying"><i /><i /><i /></div>}
            <div ref={endRef} />
          </div>
          <div className="quick" aria-label={tr(L, "quick")}>
            {quick.map((n) => <button key={n} className="fchip" onClick={() => setInput(tr(L, `qt${n}` as "qt1"))}>{tr(L, `q${n}` as "q1")}</button>)}
          </div>
          <div className="row">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={tr(L, "ask_ph")} aria-label={tr(L, "ask_ph")} />
            <button onClick={send} disabled={busy || !input.trim()}>{tr(L, "send")}</button>
          </div>
        </div>

        <div className="panel clerk">
          <h2>{tr(L, "clerking")}</h2>
          <p className="muted">Fill this in from what the patient told you, then submit for feedback.</p>
          <label><span className="n">1</span>{tr(L, "hist_sum")}
            <textarea rows={5} value={form.historySummary} onChange={(e) => setForm({ ...form, historySummary: e.target.value })} />
          </label>
          <label><span className="n">2</span>{tr(L, "lead_dx")}
            <input value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} />
          </label>
          <label><span className="n">3</span>{tr(L, "diffs")}
            <input value={form.differentials} onChange={(e) => setForm({ ...form, differentials: e.target.value })} />
          </label>
          <label><span className="n">4</span>{tr(L, "reasoning")}
            <textarea rows={3} value={form.reasoning} onChange={(e) => setForm({ ...form, reasoning: e.target.value })} />
          </label>
          {error && <p className="error">{error}</p>}
          <div className="row">
            <button className="big" onClick={submit} disabled={busy || !form.historySummary || !form.diagnosis}>{tr(L, "submit_fb")}</button>
            <button className="secondary" onClick={() => setSession(null)}>{tr(L, "new_case")}</button>
          </div>
        </div>
      </div>

      {result && (
        <div className="result">
          <div className={`verdict ${tone}`}>
            <div><small>{tr(L, "feedback")}</small><h3>Diagnosis: {dx.replace("_", " ")}</h3><p>{result.feedback.overallSummary}</p></div>
            <div className="ref"><small>Reference diagnosis</small><b>{result.reveal.diagnosis}</b></div>
          </div>
          <div className="rgrid">
            <div className="rbox good"><List title="Strengths" items={result.feedback.strengths} /></div>
            {result.feedback.missed.length > 0 && (
              <div className="rbox mid"><h4>Missed</h4><ul>{result.feedback.missed.map((m, i) => <li key={i}><b>{m.item}:</b> {m.whyItMatters}</li>)}</ul></div>
            )}
            {result.feedback.redFlagsMissed.length > 0 && <div className="rbox bad"><List title="Red flags missed" items={result.feedback.redFlagsMissed} /></div>}
            <div className="rbox"><h4>Reasoning</h4><p>{result.feedback.reasoningFeedback}</p></div>
            <div className="rbox"><List title="How to improve" items={result.feedback.improvements} /><List title="Suggested study" items={result.feedback.suggestedStudy} /></div>
            <div className="rbox"><List title="Learning points" items={result.reveal.learningPoints} /></div>
          </div>
          <p className="muted">{result.disclaimer}</p>
        </div>
      )}
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
