import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  llama: {
    baseUrl: (process.env.LLAMA_API_BASE_URL ?? "https://api.llama.com/compat/v1").replace(/\/$/, ""),
    apiKey: process.env.LLAMA_API_KEY ?? "",
    model: process.env.LLAMA_MODEL ?? "Llama-4-Maverick-17B-128E-Instruct-FP8",
    mock: process.env.MOCK_LLM === "true" || !process.env.LLAMA_API_KEY,
  },
};
