import { useEffect, useState } from "react";
import { api, getToken, setToken, type Language, type User } from "./api";
import Student from "./pages/Student";
import Patient from "./pages/Patient";
import History from "./pages/History";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Doctor from "./pages/Doctor";
import { MyConsultations } from "./pages/Consult";

type Tab = "student" | "history" | "patient" | "consults" | "doctor" | "admin" | "auth";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("auth");
  const [language, setLanguage] = useState<Language>("en");
  const [mock, setMock] = useState<boolean | null>(null);

  const isLearner = user?.role === "student" || user?.role === "intern";

  function enter(u: User) {
    setUser(u);
    setTab(u.role === "student" || u.role === "intern" ? "student" : u.role === "doctor" ? "doctor" : u.role === "admin" ? "admin" : "patient");
  }

  useEffect(() => {
    api.health().then((h) => setMock(h.mockLlm)).catch(() => setMock(null));
    if (!getToken()) return setReady(true);
    api
      .me()
      .then((r) => enter(r.user))
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  function logout() {
    setToken(null);
    setUser(null);
    setTab("auth");
  }

  if (!ready) return null;

  return (
    <div className="app">
      <header className="header">
        <h1>ClerkifyDx</h1>
        <nav>
          {isLearner && (
            <>
              <button className={tab === "student" ? "active" : ""} onClick={() => setTab("student")}>Simulation</button>
              <button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>My learning</button>
            </>
          )}
          {(!user || user.role === "patient" || isLearner) && (
            <button className={tab === "patient" ? "active" : ""} onClick={() => setTab("patient")}>Patient intake</button>
          )}
          {user?.role === "patient" && (
            <button className={tab === "consults" ? "active" : ""} onClick={() => setTab("consults")}>My consultations</button>
          )}
          {user?.role === "doctor" && (
            <button className={tab === "doctor" ? "active" : ""} onClick={() => setTab("doctor")}>Doctor dashboard</button>
          )}
          {user?.role === "admin" && (
            <button className={tab === "admin" ? "active" : ""} onClick={() => setTab("admin")}>Verify doctors</button>
          )}
        </nav>
        <select value={language} onChange={(e) => setLanguage(e.target.value as Language)} aria-label="Language">
          <option value="en">English</option>
          <option value="pcm">Nigerian Pidgin</option>
        </select>
        {user ? (
          <span className="user">
            {user.name} <small>({user.role})</small> <button className="secondary" onClick={logout}>Log out</button>
          </span>
        ) : (
          <button className="secondary" onClick={() => setTab("auth")}>Log in</button>
        )}
      </header>
      {mock && <div className="banner">Demo mode: Llama key not set, AI replies are placeholders.</div>}
      {user?.role === "doctor" && !user.verified && (
        <div className="banner">Your doctor account is pending verification. Professional features are not enabled yet.</div>
      )}
      <main>
        {tab === "auth" && <Auth onAuth={enter} onSkip={() => setTab("patient")} />}
        {tab === "student" && isLearner && <Student language={language} />}
        {tab === "history" && isLearner && <History />}
        {tab === "patient" && <Patient language={language} user={user} />}
        {tab === "consults" && user?.role === "patient" && <MyConsultations />}
        {tab === "doctor" && user?.role === "doctor" && <Doctor user={user} />}
        {tab === "admin" && user?.role === "admin" && <Admin />}
      </main>
      <footer className="footer">
        Educational and information-gathering tool only. Not medical advice or a diagnosis. In an emergency go to the nearest hospital.
      </footer>
    </div>
  );
}
