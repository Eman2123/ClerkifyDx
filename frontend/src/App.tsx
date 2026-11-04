import { useEffect, useState } from "react";
import { api, type Language } from "./api";
import Student from "./pages/Student";
import Patient from "./pages/Patient";

type Tab = "student" | "patient";

export default function App() {
  const [tab, setTab] = useState<Tab>("student");
  const [language, setLanguage] = useState<Language>("en");
  const [mock, setMock] = useState<boolean | null>(null);

  useEffect(() => {
    api.health().then((h) => setMock(h.mockLlm)).catch(() => setMock(null));
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>ClerkifyDx</h1>
        <nav>
          <button className={tab === "student" ? "active" : ""} onClick={() => setTab("student")}>
            Student simulation
          </button>
          <button className={tab === "patient" ? "active" : ""} onClick={() => setTab("patient")}>
            Patient intake
          </button>
        </nav>
        <select value={language} onChange={(e) => setLanguage(e.target.value as Language)} aria-label="Language">
          <option value="en">English</option>
          <option value="pcm">Nigerian Pidgin</option>
        </select>
      </header>
      {mock && <div className="banner">Demo mode: Llama key not set, AI replies are placeholders.</div>}
      <main>{tab === "student" ? <Student language={language} /> : <Patient language={language} />}</main>
      <footer className="footer">
        Educational and information-gathering tool only. Not medical advice or a diagnosis. In an emergency go to the nearest hospital.
      </footer>
    </div>
  );
}
