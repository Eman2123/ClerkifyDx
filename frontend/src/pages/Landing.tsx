import { useState } from "react";
import { api, setToken, type User } from "../api";

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
            <h1>Clerk a patient before you meet one.</h1>
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
        <svg className="ecg" viewBox="0 0 1200 80" preserveAspectRatio="none" aria-hidden="true">
          <path pathLength="1" d="M0 44H300l12-8 12 8h110l10 8 14-42 14 60 10-26h170l14-10 16 10h520" />
        </svg>
      </section>

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
