import { useState } from "react";
import { api, setToken, type Role, type User } from "../api";

const DEMO_PASSWORD = "Demo12345";
const DEMOS = [
  { label: "Try as student", email: "student@clerkifydx.demo" },
  { label: "Try as patient", email: "patient@clerkifydx.demo" },
  { label: "Try as doctor", email: "doctor@clerkifydx.demo" },
];

export default function Auth({ onAuth, onSkip, demo }: { onAuth: (u: User) => void; onSkip: () => void; demo?: boolean }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [f, setF] = useState({ name: "", email: "", password: "", role: "student" as Exclude<Role, "admin"> });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function tryDemo(email: string) {
    setBusy(true);
    setError("");
    try {
      const r = await api.login(email, DEMO_PASSWORD);
      setToken(r.token);
      onAuth(r.user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = mode === "login" ? await api.login(f.email, f.password) : await api.register(f);
      setToken(r.token);
      onAuth(r.user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel narrow" onSubmit={submit}>
      <h2>{mode === "login" ? "Log in" : "Create account"}</h2>
      {mode === "register" && (
        <>
          <label>Full name
            <input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </label>
          <label>I am a
            <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as typeof f.role })}>
              <option value="student">Medical student</option>
              <option value="intern">Intern / house officer</option>
              <option value="patient">Patient</option>
              <option value="doctor">Doctor (verification required)</option>
            </select>
          </label>
        </>
      )}
      <label>Email
        <input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      </label>
      <label>Password (min 8 characters)
        <input type="password" required minLength={mode === "register" ? 8 : 1} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button disabled={busy}>{mode === "login" ? "Log in" : "Sign up"}</button>
        <button type="button" className="secondary" onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "Need an account?" : "Have an account?"}
        </button>
      </div>
      {demo && (
        <div className="demo">
          <p className="muted">Judges and visitors: jump straight in with a shared demo account (no real patient data).</p>
          <div className="row">
            {DEMOS.map((d) => (
              <button key={d.email} type="button" className="secondary" disabled={busy} onClick={() => tryDemo(d.email)}>{d.label}</button>
            ))}
          </div>
        </div>
      )}
      <p className="muted">
        Feeling unwell right now? <a href="#" onClick={(e) => { e.preventDefault(); onSkip(); }}>Use patient intake without an account</a>.
      </p>
    </form>
  );
}
