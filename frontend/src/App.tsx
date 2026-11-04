import { useEffect, useState } from "react";
import { api, getToken, setToken, type Language, type User } from "./api";
import Student from "./pages/Student";
import Patient from "./pages/Patient";
import History from "./pages/History";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Doctor from "./pages/Doctor";
import { MyConsultations } from "./pages/Consult";
import { tr } from "./i18n";
import Landing from "./pages/Landing";
import { Logo, initials } from "./ui";

type Tab = "landing" | "student" | "history" | "patient" | "consults" | "doctor" | "admin" | "auth";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("landing");
  const [language, setLanguage] = useState<Language>("en");
  const [mock, setMock] = useState<boolean | null>(null);
  const [demo, setDemo] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const isLearner = user?.role === "student" || user?.role === "intern";

  function enter(u: User) {
    setUser(u);
    setTab(u.role === "student" || u.role === "intern" ? "student" : u.role === "doctor" ? "doctor" : u.role === "admin" ? "admin" : "patient");
  }

  useEffect(() => {
    api.health().then((h) => { setMock(h.mockLlm); setDemo(!!h.demo); }).catch(() => setMock(null));
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
    setTab("landing");
  }

  if (!ready) return null;

  const goAuth = (m: "login" | "register") => { setAuthMode(m); setTab("auth"); };
  const home = () => setTab(!user ? "landing" : isLearner ? "student" : user.role === "doctor" ? "doctor" : user.role === "admin" ? "admin" : "patient");
  const nav = (t: Tab, label: string) => (
    <button className={tab === t ? "active" : ""} aria-current={tab === t ? "page" : undefined} onClick={() => setTab(t)}>{label}</button>
  );

  return (
    <div className="app">
      <header className="header">
        <button className="logo" onClick={home} aria-label="ClerkifyDx home"><Logo />Clerkify<b>Dx</b></button>
        <nav aria-label="Main">
          {!user && nav("landing", "Home")}
          {isLearner && <>{nav("student", tr(language, "nav_sim"))}{nav("history", tr(language, "nav_learn"))}</>}
          {(!user || user.role === "patient" || isLearner) && nav("patient", tr(language, "nav_intake"))}
          {user?.role === "patient" && nav("consults", tr(language, "nav_consults"))}
          {user?.role === "doctor" && nav("doctor", "Doctor dashboard")}
          {user?.role === "admin" && nav("admin", "Verify doctors")}
        </nav>
        <div className="lang" role="group" aria-label="Language">
          <button aria-pressed={language === "en"} onClick={() => setLanguage("en")}>English</button>
          <button aria-pressed={language === "pcm"} onClick={() => setLanguage("pcm")}>Pidgin</button>
        </div>
        {user ? (
          <div className="user">
            <span className="avatar" aria-hidden="true">{initials(user.name)}</span>
            <span>{user.name}<small>{user.role}</small></span>
            <button className="secondary" onClick={logout}>Log out</button>
          </div>
        ) : (
          <div className="row">
            <button className="secondary" onClick={() => goAuth("login")}>Log in</button>
            <button onClick={() => goAuth("register")}>Sign up</button>
          </div>
        )}
      </header>
      {mock && <div className="banner">Demo mode: Meta Model API key not set, AI replies are placeholders.</div>}
      {user?.role === "doctor" && !user.verified && (
        <div className="banner">Your doctor account is pending verification. Professional features are not enabled yet.</div>
      )}
      <main className={tab === "landing" ? "wide" : ""}>
        {tab === "landing" && <Landing demo={demo} onAuth={enter} onPatient={() => setTab("patient")} onSignup={() => goAuth("register")} />}
        {tab === "auth" && <Auth onAuth={enter} onSkip={() => setTab("patient")} demo={demo} initialMode={authMode} key={authMode} />}
        {tab === "student" && isLearner && <Student language={language} />}
        {tab === "history" && isLearner && <History />}
        {tab === "patient" && <Patient language={language} user={user} />}
        {tab === "consults" && user?.role === "patient" && <MyConsultations />}
        {tab === "doctor" && user?.role === "doctor" && <Doctor user={user} />}
        {tab === "admin" && user?.role === "admin" && <Admin />}
      </main>
      <footer className="footer">
        {tr(language, "footer")}
      </footer>
    </div>
  );
}
