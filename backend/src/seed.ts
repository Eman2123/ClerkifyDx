import { config } from "./config.js";
import { db } from "./db.js";
import { register, seedAdmin } from "./auth.js";
import { profiles } from "./professional.js";

if (config.isProd) throw new Error("Refusing to seed demo accounts in production");

// Demo accounts for local testing and the hackathon demo only.
const PASSWORD = "Demo12345";
const accounts = [
  { email: "student@clerkifydx.demo", name: "Demo Student", role: "student" as const },
  { email: "intern@clerkifydx.demo", name: "Demo Intern", role: "intern" as const },
  { email: "patient@clerkifydx.demo", name: "Demo Patient", role: "patient" as const },
  { email: "doctor@clerkifydx.demo", name: "Dr Demo Paediatrician", role: "doctor" as const },
];

seedAdmin();
if (!config.adminEmail) {
  console.log("Tip: set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env to also create an admin.");
}

for (const a of accounts) {
  const r = register({ ...a, password: PASSWORD });
  console.log(r ? `created  ${a.email}` : `exists   ${a.email}`);
}

const doc = db.prepare("SELECT id FROM users WHERE email = ?").get("doctor@clerkifydx.demo") as { id: string } | undefined;
if (doc && !profiles.get(doc.id)) {
  profiles.upsert(doc.id, "MDCN-DEMO-0001", "Paediatrics", "Demo doctor for the hackathon walkthrough. Not a real clinician.");
  profiles.review(doc.id, true);
  console.log("demo doctor marked verified");
}
console.log(`\nDemo password for all demo accounts: ${PASSWORD}`);
