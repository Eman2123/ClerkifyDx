import { useState } from "react";
import { api, setToken, type Role, type User } from "../api";

export default function Auth({ onAuth, onSkip }: { onAuth: (u: User) => void; onSkip: () => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [f, setF] = useState({ name: "", email: "", password: "", role: "student" as Exclude<Role, "admin"> });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
      <p className="muted">
        Feeling unwell right now? <a href="#" onClick={(e) => { e.preventDefault(); onSkip(); }}>Use patient intake without an account</a>.
      </p>
    </form>
  );
}
