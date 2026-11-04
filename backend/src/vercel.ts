import type { IncomingMessage, ServerResponse } from "node:http";
import { app, ready } from "./app.js";

/** Vercel serverless entry: every /api/* request is rewritten here (see vercel.json). */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    await ready();
  } catch (err) {
    console.error("Startup failed:", err);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : "Server failed to start" }));
    return;
  }
  (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}
