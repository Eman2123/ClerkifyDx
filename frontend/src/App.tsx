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
import { ErrorBoundary, Logo, ThemeToggle, Wordmark, initials, useTheme } from "./ui";

type Tab = "landing" | "student" | "history" | "patient" | "consults" | "doctor" | "admin" | "auth";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("landing");
  const [language, setLanguage] = useState<Language>("en");
  const [mock, setMock] = useState<boolean | null>(null);
  const [demo, setDemo] = useState(false);
  const [theme, setTheme] = useTheme();
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

  if (tab === "auth") {
    return (
      <ErrorBoundary resetKey={tab}>
        <Auth onAuth={enter} onSkip={() => setTab("patient")} onBack={() => setTab("landing")} demo={demo} initialMode={authMode} key={authMode} theme={theme} onTheme={setTheme} />
      </ErrorBoundary>
    );
  }

  return (
    <div className="app">
      <a className="skip" href="#main">Skip to content</a>
      <header className="header">
        <button className="logo" onClick={home} aria-label="ClerkifyDx home"><Logo /><Wordmark /></button>
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
        <ThemeToggle theme={theme} onChange={setTheme} />
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
      <main id="main" tabIndex={-1} className={tab === "landing" ? "wide" : ""}>
        <ErrorBoundary resetKey={tab}>
          {tab === "landing" && <Landing demo={demo} onAuth={enter} onPatient={() => setTab("patient")} onSignup={() => goAuth("register")} />}
          {tab === "student" && isLearner && <Student language={language} />}
          {tab === "history" && isLearner && <History />}
          {tab === "patient" && <Patient language={language} user={user} />}
          {tab === "consults" && user?.role === "patient" && <MyConsultations />}
          {tab === "doctor" && user?.role === "doctor" && <Doctor user={user} />}
          {tab === "admin" && user?.role === "admin" && <Admin />}
        </ErrorBoundary>
      </main>
      {tab === "landing" && <footer className="footer">
        <div className="footer-in">
          <div className="f-brand">
            <span className="logo-static"><Logo /><Wordmark /></span>
            <p>AI-assisted clerking practice for medical students and structured intake for patients.</p>
          </div>
          <div>
            <h4>Product</h4>
            <ul>
              {!user && <li><button onClick={() => setTab("landing")}>Home</button></li>}
              {isLearner && <li><button onClick={() => setTab("student")}>{tr(language, "nav_sim")}</button></li>}
              {(!user || user.role === "patient" || isLearner) && <li><button onClick={() => setTab("patient")}>{tr(language, "nav_intake")}</button></li>}
              {user?.role === "patient" && <li><button onClick={() => setTab("consults")}>{tr(language, "nav_consults")}</button></li>}
              {!user && <li><button onClick={() => goAuth("login")}>Log in</button></li>}
              {!user && <li><button onClick={() => goAuth("register")}>Sign up</button></li>}
            </ul>
          </div>
          <div>
            <h4>Safety</h4>
            <ul className="f-safe">
              <li>Emergency signs are checked before any AI reply</li>
              <li>Doctors are verified by an administrator</li>
              <li>Your summary is shared only with your consent</li>
            </ul>
          </div>
        </div>
        <p className="f-note">{tr(language, "footer")}</p>
        <div className="f-bottom">
          <span>© {new Date().getFullYear()} ClerkifyDx</span>
          <span>Prototype built on Meta Muse Spark · Not a medical device</span>
        </div>
      </footer>}
    </div>
  );
}
