import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  dbPath: process.env.DB_PATH ?? "./data/clerkifydx.db",
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-secret-change-me",
  adminEmail: (process.env.ADMIN_EMAIL ?? "").toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD ?? "",
  isProd: process.env.NODE_ENV === "production",
  // Meta Model API (Muse Spark). Docs: https://dev.meta.ai/docs
  ai: {
    baseUrl: (process.env.MODEL_API_BASE_URL ?? "https://api.meta.ai/v1").replace(/\/$/, ""),
    apiKey: process.env.MODEL_API_KEY ?? "",
    // "muse-spark-1.3" = Standard mode (prompts are not used for training). Don't use the "-contributor" IDs with patient data.
    model: process.env.MODEL_NAME ?? "muse-spark-1.3",
    // Optional: minimal | low | medium | high | xhigh | max. Unset = model default.
    reasoningEffort: process.env.MODEL_REASONING_EFFORT ?? "",
    mock: process.env.MOCK_LLM === "true" || !process.env.MODEL_API_KEY,
  },
};
;
