import { config } from "./config.js";
import { seedAdmin } from "./auth.js";
import { DEMO_PASSWORD, seedDemo } from "./demo.js";

if (config.isProd && !config.demoSeed) throw new Error("Refusing to seed demo accounts in production");

seedAdmin();
if (!config.adminEmail) {
  console.log("Tip: set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env to also create an admin.");
}
seedDemo(console.log);
console.log(`\nDemo password for all demo accounts: ${DEMO_PASSWORD}`);
