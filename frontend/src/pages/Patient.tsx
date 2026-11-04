import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { api, type Language, type PatientRecord, type User } from "../api";
import { FindDoctor } from "./Consult";
import { tr } from "../i18n";
import { Check } from "../ui";
import { gsap, prefersReduced } from "../motion";

interface Msg {
  from: "you" | "ai";
  text: string;
  emergency?: boolean;
}

const T = {
  en: {
    badge: "AI-assisted intake",
    how: "How it works",
    s1: "Describe what is wrong in your own words",
    s2: "Answer one question at a time",
    s3: "Get a clear summary a doctor can read in a minute",
    before: "Before we begin",
    assistant: "Intake assistant",
    online: "Online · never diagnoses",
    quick: "Quick start",
    progress: "Intake progress",
    progressHint: (n: number) => (n < 3 ? "Keep going, a few more answers help the doctor." : "Good detail. You can finish whenever you are ready."),
    tips: "Helpful details",
    tip1: "When it started and how it has changed",
    tip2: "How strong it feels, from 1 to 10",
    tip3: "Medicines you take and any allergies",
    emergency: "Emergency?",
    emergencyText: "Chest pain, trouble breathing, heavy bleeding or fits: go to the nearest hospital now. Do not wait for this chat.",
    typing: "Assistant is typing",
    chips: ["I have a fever", "Headache since yesterday", "Stomach pain", "I feel dizzy"],
    finish: "Finish and summarise",
    stay: "Your answers stay private until you choose to share them.",
  },
  pcm: {
    badge: "AI go help collect your story",
    how: "How e dey work",
    s1: "Talk wetin dey do you with your own mouth",
    s2: "Answer one question at a time",
    s3: "Get clear summary wey doctor fit read quick quick",
    before: "Before we start",
    assistant: "Intake assistant",
    online: "E dey online · e no dey diagnose",
    quick: "Quick start",
    progress: "How far you don go",
    progressHint: (n: number) => (n < 3 ? "Continue small, more answer go help doctor." : "Na good detail be that. You fit finish when you ready."),
    tips: "Wetin go help",
    tip1: "When e start and how e don change",
    tip2: "How e strong reach, from 1 to 10",
    tip3: "Drugs wey you dey take and any allergy",
    emergency: "Na emergency?",
    emergencyText: "Chest pain, wahala to breathe, plenty blood or fits: run go the nearest hospital now. No wait for this chat.",
    typing: "Assistant dey type",
    chips: ["Fever dey worry me", "Headache since yesterday", "My belle dey pain me", "Head dey turn me"],
    finish: "Finish and summarise",
    stay: "Your answers go stay private until you gree share am.",
  },
};

const PulseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12h5l2-5 4 11 3-8 1.5 2H22" /></svg>
);
const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

function urgencyClass(u: string) {
  if (u.includes("emergency")) return "complex";
  if (u.includes("urgent") || u.includes("soon")) return "intermediate";
  return "";
}

export default function Patient({ language, user }: { language: Language; user: User | null }) {
  const t = T[language];
  const [consent, setConsent] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [disclaimer, setDisclaimer] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [record, setRecord] = useState<{ record: PatientRecord; notice: string } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const answers = msgs.filter((m) => m.from === "you").length;

  // scroll the chat container only (not the page) when messages change
  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  // intro animation for whichever screen is showing
  useLayoutEffect(() => {
    if (prefersReduced() || !root.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      if (!sessionId) {
        tl.from(".pt-hero", { x: -50, opacity: 0, duration: 0.8 })
          .from(".pt-hero .badge, .pt-hero h2, .pt-hero > p", { y: 24, opacity: 0, stagger: 0.1, duration: 0.6 }, "-=0.5")
          .from(".pt-hero .assure li", { x: -24, opacity: 0, stagger: 0.12, duration: 0.5 }, "-=0.3")
          .from(".pt-card", { x: 50, opacity: 0, duration: 0.8 }, 0.1)
          .from(".pt-card .mini-steps li", { y: 16, opacity: 0, stagger: 0.1, duration: 0.45 }, "-=0.4");
        gsap.to(".pt-hero .orb", { x: 30, y: -24, duration: 4, repeat: -1, yoyo: true, ease: "sine.inOut", stagger: 0.8 });
      } else {
        tl.from(".chat-card", { y: 40, opacity: 0, duration: 0.7 })
          .from(".pt-side > *", { x: 40, opacity: 0, stagger: 0.12, duration: 0.6 }, 0.15)
          .from(".quick button", { y: 12, opacity: 0, scale: 0.9, stagger: 0.08, duration: 0.4 }, "-=0.2");
      }
    }, root);
    return () => ctx.revert();
  }, [sessionId]);

  // pop in each newly added message bubble
  useLayoutEffect(() => {
    if (prefersReduced() || !chatRef.current) return;
    const fresh = Array.from(chatRef.current.querySelectorAll<HTMLElement>(".msg")).filter((r) => !r.dataset.anim);
    fresh.forEach((r) => { r.dataset.anim = "1"; });
    if (fresh.length) gsap.from(fresh, { y: 16, opacity: 0, scale: 0.96, duration: 0.4, stagger: 0.08, ease: "back.out(1.6)", clearProps: "transform,opacity" });
  }, [msgs]);

  // progress meter
  useLayoutEffect(() => {
    if (!sessionId) return;
    const pct = Math.min(100, Math.round((answers / 6) * 100));
    if (prefersReduced()) { gsap.set(".meter i", { width: pct + "%" }); return; }
    gsap.to(".meter i", { width: pct + "%", duration: 0.8, ease: "power3.out" });
  }, [answers, sessionId]);

  // reveal summary
  useLayoutEffect(() => {
    if (!record || prefersReduced()) return;
    gsap.from(".sum-card", { y: 30, opacity: 0, duration: 0.7, ease: "power3.out", clearProps: "transform,opacity" });
    gsap.from(".sum-grid > div", { y: 16, opacity: 0, stagger: 0.07, duration: 0.45, delay: 0.25, ease: "power2.out", clearProps: "transform,opacity" });
    document.querySelector(".sum-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [record]);

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

  async function send(override?: string) {
    const text = (override ?? input).trim();
    if (!sessionId || !text || busy) return;
    setInput("");
    setError("");
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

  /* ---------------- start screen ---------------- */
  if (!sessionId) {
    return (
      <div className="pt-wrap" ref={root}>
        <section className="pt-hero">
          <i className="orb a" /><i className="orb b" />
          <span className="badge on-dark"><i />{t.badge}</span>
          <h2>{tr(language, "intake_title")}</h2>
          <p>{tr(language, "intake_intro")}</p>
          <ul className="assure">
            <li><Check /><span>{tr(language, "assure1")}</span></li>
            <li><Check /><span>{tr(language, "assure2")}</span></li>
            <li><Check /><span>{tr(language, "assure3")}</span></li>
          </ul>
        </section>
        <section className="pt-card">
          <h3>{t.how}</h3>
          <ol className="mini-steps">
            <li><span>1</span>{t.s1}</li>
            <li><span>2</span>{t.s2}</li>
            <li><span>3</span>{t.s3}</li>
          </ol>
          <h4>{t.before}</h4>
          <label className="check consent">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            {tr(language, "consent")}
          </label>
          <button className="big pill" onClick={start} disabled={!consent}>{tr(language, "start")} <SendIcon /></button>
          <p className="muted small">{t.stay}</p>
          {error && <p className="error">{error}</p>}
        </section>
      </div>
    );
  }

  /* ---------------- chat screen ---------------- */
  return (
    <div ref={root}>
      <div className="pt-chat">
        <section className="chat-card" aria-label={t.assistant}>
          <header className="chat-head">
            <span className="ai-av"><PulseIcon /></span>
            <div>
              <b>{t.assistant}</b>
              <small><i className="live" />{t.online}</small>
            </div>
          </header>
          <p className="disclaimer">{disclaimer}</p>
          <div className="chat" ref={chatRef} aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={`msg ${m.from}`}>
                {m.from === "ai" && <span className="ai-av sm"><PulseIcon /></span>}
                <div className={`bubble ${m.from === "you" ? "you" : "patient"} ${m.emergency ? "emergency" : ""}`}>{m.text}</div>
              </div>
            ))}
            {busy && (
              <div className="msg ai" aria-label={t.typing}>
                <span className="ai-av sm"><PulseIcon /></span>
                <div className="bubble patient typing"><i /><i /><i /></div>
              </div>
            )}
            <div ref={endRef} />
          </div>
          {msgs.length === 1 && !busy && (
            <div className="quick" aria-label={t.quick}>
              {t.chips.map((c) => <button key={c} type="button" className="secondary" onClick={() => send(c)}>{c}</button>)}
            </div>
          )}
          {error && <p className="error pad">{error}</p>}
          <div className="composer">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={tr(language, "placeholder")}
              aria-label={tr(language, "placeholder")}
            />
            <button type="button" className="send-btn" onClick={() => send()} disabled={busy || !input.trim()} aria-label={tr(language, "send")}><SendIcon /></button>
            <button type="button" className="secondary pill" onClick={finish} disabled={busy || msgs.length < 3}>{t.finish}</button>
          </div>
        </section>

        <aside className="pt-side">
          <div className="side-card">
            <h4>{t.progress}</h4>
            <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round((answers / 6) * 100))}><i /></div>
            <p className="muted small">{t.progressHint(answers)}</p>
          </div>
          <div className="side-card">
            <h4>{t.tips}</h4>
            <ul className="tips">
              <li>{t.tip1}</li>
              <li>{t.tip2}</li>
              <li>{t.tip3}</li>
            </ul>
          </div>
          <div className="side-card alert">
            <h4>{t.emergency}</h4>
            <p>{t.emergencyText}</p>
          </div>
        </aside>
      </div>

      {record && (
        <section className="sum-card">
          <header>
            <h3>{tr(language, "summary")}</h3>
            <span className={`tag ${urgencyClass(record.record.suggestedUrgency)}`}>{record.record.suggestedUrgency.replace(/_/g, " ")}</span>
          </header>
          <div className="sum-grid">
            <div className="wide"><dt>{tr(language, "complaint")}</dt><dd>{record.record.presentingComplaint}</dd></div>
            <div className="wide"><dt>{tr(language, "history")}</dt><dd>{record.record.historyOfComplaint}</dd></div>
            <div><dt>{tr(language, "associated")}</dt><dd>{record.record.associatedSymptoms.join(", ") || tr(language, "none")}</dd></div>
            <div><dt>{tr(language, "pmh")}</dt><dd>{record.record.pastMedicalHistory}</dd></div>
            <div><dt>{tr(language, "meds")}</dt><dd>{record.record.medications}</dd></div>
            <div><dt>{tr(language, "allergies")}</dt><dd>{record.record.allergies}</dd></div>
            <div className="wide"><dt>{tr(language, "unknown")}</dt><dd>{record.record.unknown.join(", ") || "-"}</dd></div>
          </div>
          <p className="muted">{record.notice}</p>
          {user?.role === "patient" && record.record.suggestedUrgency !== "emergency_now" && sessionId && (
            <FindDoctor triageSessionId={sessionId} />
          )}
          {!user && <p className="muted">Create a patient account to request a doctor consultation.</p>}
        </section>
      )}
    </div>
  );
}
