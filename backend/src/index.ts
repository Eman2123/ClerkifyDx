import { app, ready } from "./app.js";
import { config } from "./config.js";

// Local development entry (npm run dev:backend). On Vercel the API runs through src/vercel.ts instead.
ready()
  .then(() => {
    app.listen(config.port, () => {
      console.log(`ClerkifyDx API on :${config.port} (model: ${config.ai.model}, mock: ${config.ai.mock}, db: postgres)`);
    });
  })
  .catch((err) => {
    console.error("Failed to start:", err);
    process.exit(1);
  });
