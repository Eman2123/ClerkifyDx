import { Component, useEffect, useState, type ReactNode } from "react";

export function Logo() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="11" style={{ fill: "var(--brand)" }} />
      <path d="M5 21h8l3-7 5 15 4-11 2 3h8" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The wordmark as one element, so flex gaps never split "Clerkify" from "Dx". */
export function Wordmark() {
  return <span className="wm">Clerkify<b>Dx</b></span>;
}

export function Check() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><path d="m7.5 12.5 3 3 6-7" />
    </svg>
  );
}
export const initials = (name: string) => name.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");

/** Catches a crash in one page so the header and footer stay usable instead of the whole app going blank. */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error("Page crashed:", error);
  }
  componentDidUpdate(prev: { resetKey?: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false });
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="panel narrow" role="alert">
        <h2>This page hit a problem</h2>
        <p className="muted">Nothing you entered was lost on the server. Reload the page, or use the menu to go somewhere else.</p>
        <div className="row">
          <button onClick={() => this.setState({ failed: false })}>Try again</button>
          <button className="secondary" onClick={() => window.location.reload()}>Reload page</button>
        </div>
      </div>
    );
  }
}

export type Theme = "light" | "dark";
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const s = localStorage.getItem("theme");
      if (s === "light" || s === "dark") return s;
    } catch { /* ignore */ }
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("theme", theme); } catch { /* ignore */ }
  }, [theme]);
  return [theme, setTheme] as const;
}

export function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  const dark = theme === "dark";
  return (
    <button type="button" className="theme-btn" aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} title={dark ? "Light mode" : "Dark mode"} onClick={() => onChange(dark ? "light" : "dark")}>
      {dark ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
      )}
    </button>
  );
}
