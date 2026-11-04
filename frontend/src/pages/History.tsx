import { useEffect, useState } from "react";
import { api, type LearningHistory } from "../api";

export default function History() {
  const [h, setH] = useState<LearningHistory | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api.learning().then(setH).catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!h) return <p className="muted">Loading...</p>;

  return (
    <section className="panel narrow">
      <h2>My learning</h2>
      <p>
        Cases started: <b>{h.totals.started}</b> · completed: <b>{h.totals.completed}</b>
      </p>
      {h.recurringOmissions.length > 0 && (
        <>
          <h3>Things you often miss</h3>
          <ul>{h.recurringOmissions.map((o) => <li key={o.item}>{o.item} ({o.count}x)</li>)}</ul>
        </>
      )}
      <h3>Past cases</h3>
      {h.sessions.length === 0 && <p className="muted">No cases yet. Start one from the Simulation tab.</p>}
      <ul className="plain">
        {h.sessions.map((s) => (
          <li key={s.id}>
            <b>{s.title}</b> <span className="muted">{s.department} · {s.difficulty}</span>
            <br />
            <span className="muted">
              {new Date(s.createdAt).toLocaleString()} · {s.submitted ? `submitted (${s.diagnosisAssessment?.replace("_", " ") ?? "reviewed"})` : "not submitted"}
            </span>
          </li>
        ))}
      </ul>
      <p className="muted">Progress here is educational information, not an assessment of clinical competence.</p>
    </section>
  );
}
