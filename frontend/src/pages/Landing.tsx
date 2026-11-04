import { useState } from "react";
import { api, setToken, type User } from "../api";


const I = {
  chat: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.3A8 8 0 1 1 21 12z" /></svg>,
  list: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" /></svg>,
  globe: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>,
  shield: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z" /><path d="m9 12 2 2 4-4" /></svg>,
  image: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="1.6" /><path d="m21 16-5-5-9 9" /></svg>,
  user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>,
};
const FEATURES = [
  { ic: I.chat, t: "Realistic AI patient", d: "Stays in character and reveals history only when you ask the right question." },
  { ic: I.list, t: "Structured feedback", d: "See strengths, omissions, missed red flags and clinical reasoning after every case." },
  { ic: I.image, t: "Visual cases", d: "Read an X-ray or clinical photo and compare your findings with hidden reference notes." },
  { ic: I.globe, t: "English + Pidgin", d: "Patients describe symptoms in the language they are most comfortable with." },
  { ic: I.shield, t: "Safety first", d: "A rule-based red-flag check runs before any AI call, so emergencies never wait." },
  { ic: I.user, t: "Verified doctors", d: "Summaries reach only administrator-verified doctors, and only after they accept." },
];
const FAQ = [
  { q: "Does the AI diagnose patients?", a: "No. Intake output is a preliminary summary meant for clinician review, and the simulation is for education only." },
  { q: "Who can see my symptom summary?", a: "Only a verified doctor, and only after they accept your consultation request." },
  { q: "What happens in an emergency?", a: "Red-flag rules run first and return emergency guidance immediately. Online consultation is blocked for those cases." },
  { q: "Is this a medical device?", a: "No. ClerkifyDx is a prototype and is not clinically validated. In an emergency, go to the nearest hospital." },
];

const DEMOS = [
  { label: "Try as student", email: "student@clerkifydx.demo" },
  { label: "Try as patient", email: "patient@clerkifydx.demo" },
  { label: "Try as doctor", email: "doctor@clerkifydx.demo" },
];

export default function Landing({ demo, onAuth, onPatient, onSignup }: { demo: boolean; onAuth: (u: User) => void; onPatient: () => void; onSignup: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function tryDemo(email: string) {
    setBusy(true); setError("");
    try { const r = await api.login(email, "Demo12345"); setToken(r.token); onAuth(r.user); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <>
      <section className="hero">
        <div className="hero-in">
          <div>
            <span className="badge"><i />AI clinical-skills practice</span>
            <h1>Clerk a patient <em>before</em> you meet one.</h1>
            <p className="lead">
              ClerkifyDx lets medical students practise history-taking on an AI patient and shows exactly what they missed.
              Patients describe their symptoms in English or Nigerian Pidgin and hand a clear summary to a verified doctor.
            </p>
            <div className="cta">
              {demo ? (
                <button className="big" disabled={busy} onClick={() => tryDemo(DEMOS[0].email)}>Try the student demo</button>
              ) : (
                <button className="big" onClick={onSignup}>Create a free account</button>
              )}
              <button className="big secondary" onClick={onPatient}>Describe my symptoms</button>
            </div>
            {error && <p className="error">{error}</p>}
            <div className="chips"><span>English + Nigerian Pidgin</span><span>Built on Meta Muse Spark</span><span>AI never diagnoses</span></div>
          </div>
          <div className="scene">
          <div className="sheet" aria-label="Example of a simulated clerking">
            <div className="sheet-h"><span>Case: Child with fever</span><span>Paediatrics · Simple</span></div>
            <div className="sheet-b">
              <div className="bubble you">Any fits or shaking?</div>
              <div className="bubble patient">No shaking. The body just dey hot since Monday, e no gree chop.</div>
              <div className="bubble you">Does the child sleep under a net?</div>
            </div>
            <div className="sheet-f"><b>Feedback after you submit</b>Asked about: duration, fits. Missed: immunisation history, urine output.</div>
          </div>
          </div>
        </div>
        <svg className="ecg" viewBox="0 0 1200 80" preserveAspectRatio="none" aria-hidden="true">
          <path pathLength="1" d="M0 44H300l12-8 12 8h110l10 8 14-42 14 60 10-26h170l14-10 16 10h520" />
        </svg>
      </section>

      <div className="stats-strip" aria-label="At a glance">
        <div><b>11</b><span>practice cases</span></div>
        <div><b>4</b><span>specialties</span></div>
        <div><b>2</b><span>languages</span></div>
        <div><b>0</b><span>AI diagnoses given</span></div>
      </div>

      <section className="sec">
        <h2>Everything you need to practise and prepare</h2>
        <p className="sub">Tools for learners and patients, built around safety from the first message.</p>
        <div className="feat-grid">
          {FEATURES.map((f) => (
            <div className="feat" key={f.t}><div className="ic">{f.ic}</div><h3>{f.t}</h3><p>{f.d}</p></div>
          ))}
        </div>
      </section>

      <section className="sec alt"><div className="in">
        <h2>How a practice session works</h2>
        <p className="sub">From picking a case to learning what you missed, in a few minutes.</p>
        <div className="steps">
          <div><b>Pick a case</b><p>Choose by specialty and difficulty, from simple to complex.</p></div>
          <div><b>Clerk the patient</b><p>Ask questions in your own words. The AI patient answers only what you ask.</p></div>
          <div><b>Get feedback</b><p>See what you covered, what you missed, and which red flags slipped by.</p></div>
        </div>
      </div></section>

      <section className="sec">
        <h2>One platform, two ways in</h2>
        <p className="sub">Students and patients use different tools with different safeguards. The simulation never touches patient data.</p>
        <div className="split">
          <div>
            <h3>Students and interns</h3>
            <p>Practise on 11 cases across paediatrics, obstetrics, surgery and internal medicine.</p>
            <ul><li>An AI patient who only answers what you ask</li><li>Feedback on strengths, omissions and missed red flags</li><li>A learning history of the questions you keep forgetting</li></ul>
            <button onClick={onSignup}>Start practising</button>
          </div>
          <div>
            <h3>Patients</h3>
            <p>Tell your story once, in the language you are comfortable with.</p>
            <ul><li>One question at a time, with your consent first</li><li>A structured summary a doctor can read in a minute</li><li>Request a verified doctor and share the summary only if they accept</li></ul>
            <button className="secondary" onClick={onPatient}>Start intake</button>
          </div>
        </div>
      </section>

      <section className="sec alt"><div className="in">
        <h2>Emergency checks never wait for the AI</h2>
        <p className="sub">Every patient message passes a rule-based red-flag check first, so urgent guidance does not depend on a model or the network.</p>
        <div className="flow">
          <div><b>Patient sends a message</b>For example: chest pain and difficulty breathing.</div>
          <div className="alert"><b>Red-flag rules run first</b>A match returns emergency guidance immediately and blocks online consultation.</div>
          <div><b>AI continues the intake</b>Only when nothing urgent is found. It organises symptoms and never gives a diagnosis.</div>
        </div>
      </div></section>

      <section className="sec">
        <h2>Consultations that never overstate</h2>
        <p className="sub">Doctors are verified by an administrator before they are listed. Status is never skipped, so nothing says a doctor reviewed your case before they did.</p>
        <div className="states"><span className="tag requested">requested</span><i>then</i><span className="tag accepted">accepted</span><i>then</i><span className="tag completed">completed</span><i>or</i><span className="tag declined">declined</span></div>
      </section>

      <section className="sec alt"><div className="in">
        <h2>Built on Meta Muse Spark</h2>
        <div className="meta">
          <div><h3>AI patient</h3><p>Plays the case from a hidden script and reveals history only when asked.</p></div>
          <div><h3>Clerking feedback</h3><p>Returns structured feedback: strengths, omissions, red flags and reasoning.</p></div>
          <div><h3>Patient intake</h3><p>Asks one question at a time in English or Pidgin and writes the clinician summary.</p></div>
        </div>
      </div></section>

      <section className="sec">
        <h2>Questions, answered</h2>
        <div className="faq">
          {FAQ.map((f) => (<details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>))}
        </div>
      </section>

      <section className="cta-band">
        <h2>See it in under three minutes</h2>
        <p>{demo ? "Jump in with a shared demo account. No real patient data." : "Create an account or start an intake without one."}</p>
        <div className="cta">
          {demo ? DEMOS.map((d) => <button key={d.email} className="big secondary" disabled={busy} onClick={() => tryDemo(d.email)}>{d.label}</button>)
                : <button className="big secondary" onClick={onSignup}>Create an account</button>}
        </div>
        <small>Prototype for the Meta Global AI Developer Hackathon. Not a medical device and not clinically validated.</small>
      </section>
    </>
  );
}
