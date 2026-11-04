import { useLayoutEffect, useRef, useState } from "react";
import { api, setToken, type Role, type User } from "../api";
import { gsap, prefersReduced } from "../motion";
import { Check, Logo, ThemeToggle, Wordmark, type Theme } from "../ui";

const DEMOS = [
  { label: "Try as student", email: "student@clerkifydx.demo" },
  { label: "Try as patient", email: "patient@clerkifydx.demo" },
  { label: "Try as doctor", email: "doctor@clerkifydx.demo" },
];
const ROLES: { id: Exclude<Role, "admin">; label: string }[] = [
  { id: "student", label: "Medical student" },
  { id: "intern", label: "Intern / house officer" },
  { id: "patient", label: "Patient" },
  { id: "doctor", label: "Doctor (needs verification)" },
];

export default function Auth({ onAuth, onSkip, onBack, demo, initialMode = "login", theme, onTheme }: { theme: Theme; onTheme: (t: Theme) => void; onAuth: (u: User) => void; onSkip: () => void; onBack: () => void; demo?: boolean; initialMode?: "login" | "register" }) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [f, setF] = useState({ name: "", email: "", password: "", role: "student" as Exclude<Role, "admin"> });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (prefersReduced() || !root.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".auth-side", { x: -60, opacity: 0, duration: 0.8 })
        .from(".auth-brand, .auth-side h2", { y: 20, opacity: 0, stagger: 0.1, duration: 0.5 }, "-=0.5")
        .from(".auth-side .assure li", { x: -24, opacity: 0, stagger: 0.12, duration: 0.5 }, "-=0.3")
        .from(".auth-form", { y: 50, opacity: 0, duration: 0.8 }, 0.15)
        .from(".auth-form > *", { y: 14, opacity: 0, stagger: 0.05, duration: 0.4 }, "-=0.5");
    }, root);
    return () => ctx.revert();
  }, []);

  async function tryDemo(email: string) {
    setBusy(true); setError("");
    try { const r = await api.login(email, "Demo12345"); setToken(r.token); onAuth(r.user); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const r = mode === "login" ? await api.login(f.email, f.password) : await api.register(f);
      setToken(r.token); onAuth(r.user);
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="auth" ref={root}>
      <div className="auth-top"><ThemeToggle theme={theme} onChange={onTheme} /></div>
      <aside className="auth-side">
        <button type="button" className="auth-brand" onClick={onBack} aria-label="ClerkifyDx home"><Logo /><Wordmark /></button>
        <h2>Practise safely. Get care organised.</h2>
        <ul className="assure">
          <li><Check /><div><b>Students</b><span>Clerk an AI patient and see what you missed.</span></div></li>
          <li><Check /><div><b>Patients</b><span>Describe symptoms once and share a clear summary with a verified doctor.</span></div></li>
          <li><Check /><div><b>Doctors</b><span>Review structured summaries after you accept a request.</span></div></li>
        </ul>
        <p className="auth-note">The AI never diagnoses. In an emergency, go to the nearest hospital.</p>
      </aside>
      <div className="auth-wrap">
      <form className="auth-form" onSubmit={submit}>
        <button type="button" className="auth-back" onClick={onBack}>&larr; Back to home</button>
        <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
        <p className="sub">{mode === "login" ? "Log in to continue your practice or intake." : "Join as a student, patient or doctor in under a minute."}</p>
        {mode === "register" && (
          <>
            <label>Full name
              <input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" />
            </label>
            <div className="muted" style={{ fontWeight: 600, color: "var(--ink)" }}>I am a</div>
            <div className="roles" role="group" aria-label="Role">
              {ROLES.map((r) => (
                <button type="button" key={r.id} aria-pressed={f.role === r.id} onClick={() => setF({ ...f, role: r.id })}>{r.label}</button>
              ))}
            </div>
          </>
        )}
        <label>Email
          <input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" />
        </label>
        <label>Password{mode === "register" ? " (at least 8 characters)" : ""}
          <input type="password" required minLength={mode === "register" ? 8 : 1} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete={mode === "login" ? "current-password" : "new-password"} />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="big" disabled={busy}>{mode === "login" ? "Log in" : "Create account"}</button>
        <div style={{ marginTop: 6 }}>
          <button type="button" className="switch" onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "New here? Sign up" : "Have an account? Log in"}
          </button>
        </div>
        {demo && (
          <div className="demo">
            <p className="muted">Judges and visitors: use a shared demo account. No real patient data.</p>
            <div className="row">
              {DEMOS.map((d) => <button key={d.email} type="button" className="secondary" disabled={busy} onClick={() => tryDemo(d.email)}>{d.label}</button>)}
            </div>
          </div>
        )}
        <p className="muted" style={{ marginTop: 18 }}>
          Feeling unwell now? <a href="#" onClick={(e) => { e.preventDefault(); onSkip(); }}>Use patient intake without an account</a>.
        </p>
      </form>
      </div>
    </div>
  );
}
