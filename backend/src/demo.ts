import { queryOne } from "./db.js";
import { register } from "./auth.js";
import { profiles } from "./professional.js";

/** Demo accounts for local testing and the hackathon demo only. */
export const DEMO_PASSWORD = "Demo12345";
export const demoAccounts = [
  { email: "student@clerkifydx.demo", name: "Demo Student", role: "student" as const },
  { email: "intern@clerkifydx.demo", name: "Demo Intern", role: "intern" as const },
  { email: "patient@clerkifydx.demo", name: "Demo Patient", role: "patient" as const },
  { email: "doctor@clerkifydx.demo", name: "Dr Demo Paediatrician", role: "doctor" as const },
];

export async function seedDemo(log: (m: string) => void = () => {}): Promise<void> {
  for (const a of demoAccounts) {
    const r = await register({ ...a, password: DEMO_PASSWORD });
    log(r ? `created  ${a.email}` : `exists   ${a.email}`);
  }
  const doc = await queryOne<{ id: string }>("SELECT id FROM users WHERE email = $1", ["doctor@clerkifydx.demo"]);
  if (doc && !(await profiles.get(doc.id))) {
    await profiles.upsert(doc.id, "MDCN-DEMO-0001", "Paediatrics", "Demo doctor for the hackathon walkthrough. Not a real clinician.");
    await profiles.review(doc.id, true);
    log("demo doctor marked verified");
  }
}
