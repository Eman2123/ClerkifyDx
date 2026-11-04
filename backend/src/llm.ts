import { config } from "./config.js";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
}

/**
 * Calls Meta Muse Spark through the Meta Model API (OpenAI-compatible Chat Completions).
 * Docs: https://dev.meta.ai/docs/protocols/chat-completions
 */
export async function chat(messages: ChatMessage[], opts: CompletionOptions = {}): Promise<string> {
  if (config.ai.mock) return mockReply(messages, opts);

  const body: Record<string, unknown> = {
    model: config.ai.model,
    messages,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 800,
  };
  if (config.ai.reasoningEffort) body.reasoning_effort = config.ai.reasoningEffort;

  // JSON is requested in the prompt and parsed tolerantly by parseJson(); response_format is a best-effort extra.
  let res = await post(opts.json ? { ...body, response_format: { type: "json_object" } } : body);
  if (opts.json && res.status === 400) res = await post(body); // retry without response_format if rejected

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Meta Model API error ${res.status}: ${errBody.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string | { type?: string; text?: string }[] | null } }[];
  };
  const raw = data.choices?.[0]?.message?.content;
  const text = Array.isArray(raw) ? raw.map((p) => p.text ?? "").join("") : raw;
  if (!text) throw new Error("Meta Model API returned an empty response");
  return text.trim();
}

function post(payload: Record<string, unknown>): Promise<Response> {
  return fetch(`${config.ai.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.ai.apiKey}`,
    },
    body: JSON.stringify(payload),
  });
}

/** Extracts and parses a JSON object from model output (tolerates code fences / prose). */
export function parseJson<T>(text: string): T {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in model output");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

function mockReply(messages: ChatMessage[], opts: CompletionOptions): string {
  if (opts.json) {
    const sys = messages[0]?.content ?? "";
    if (sys.includes("clinical educator")) {
      return JSON.stringify({
        overallSummary: "[MOCK] Good start. Set MODEL_API_KEY for real AI feedback.",
        strengths: ["Asked about the presenting complaint"],
        missed: [{ item: "Associated symptoms", whyItMatters: "Narrows the differential diagnosis." }],
        reasoningFeedback: "[MOCK] Link findings to each differential.",
        redFlagsMissed: [],
        diagnosisAssessment: "partially_supported",
        improvements: ["Use a structured history framework"],
        suggestedStudy: ["Fever in children"],
      });
    }
    return JSON.stringify({ summary: "[MOCK] summary", reply: "[MOCK] Please configure MODEL_API_KEY." });
  }
  return "[MOCK] Meta Model API is not configured. Set MODEL_API_KEY in backend/.env to enable live AI responses.";
}
