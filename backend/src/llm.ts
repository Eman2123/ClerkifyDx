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
  return complete(messages, opts);
}

/**
 * Image understanding with Muse Spark (multimodal input). The image is sent as a base64 data URL.
 * Docs: https://dev.meta.ai/docs/image-understanding
 */
export async function chatVision(system: string, text: string, imageDataUrl: string, opts: CompletionOptions = {}): Promise<string> {
  if (config.ai.mock) return mockReply([{ role: "system", content: system }], opts);
  return complete(
    [
      { role: "system", content: system },
      {
        role: "user",
        content: [
          { type: "text", text },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
    opts,
  );
}

async function complete(messages: unknown[], opts: CompletionOptions): Promise<string> {
  const maxTokens = opts.maxTokens ?? 800;
  const first = await attempt(messages, opts, maxTokens, config.ai.reasoningEffort);
  if (first.text) return first.text;
  // Reasoning models can spend the whole token budget thinking and return empty content.
  // Retry once with a bigger budget and minimal reasoning.
  console.error("Meta Model API empty response, retrying:", first.debug);
  const second = await attempt(messages, opts, Math.max(maxTokens * 4, 3000), "minimal");
  if (second.text) return second.text;
  throw new Error(`Meta Model API returned an empty response (${second.debug})`);
}

async function attempt(messages: unknown[], opts: CompletionOptions, maxTokens: number, effort: string): Promise<{ text: string; debug: string }> {
  const body: Record<string, unknown> = {
    model: config.ai.model,
    messages,
    temperature: opts.temperature ?? 0.4,
    max_tokens: maxTokens,
  };
  if (effort) body.reasoning_effort = effort;

  // JSON is requested in the prompt and parsed tolerantly by parseJson(); response_format is a best-effort extra.
  let res = await post(opts.json ? { ...body, response_format: { type: "json_object" } } : body);
  if (res.status === 400) {
    const errBody = await res.clone().text().catch(() => "");
    console.error("Meta Model API 400, retrying without optional params:", errBody.slice(0, 300));
    const { response_format: _rf, reasoning_effort: _re, ...plain } = { ...body, response_format: undefined } as Record<string, unknown>;
    res = await post(plain);
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Meta Model API error ${res.status}: ${errBody.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    choices?: { finish_reason?: string; message?: { content?: string | { type?: string; text?: string }[] | null } }[];
    usage?: unknown;
  };
  const choice = data.choices?.[0];
  const raw = choice?.message?.content;
  const text = (Array.isArray(raw) ? raw.map((p) => p.text ?? "").join("") : raw) ?? "";
  const debug = `model=${config.ai.model} finish=${choice?.finish_reason} max_tokens=${maxTokens} usage=${JSON.stringify(data.usage ?? null)}`;
  return { text: text.trim(), debug };
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
    if (sys.includes("image interpretation")) {
      return JSON.stringify({
        rating: "partial",
        correct: ["[MOCK] You described the main abnormality"],
        missed: ["[MOCK] Set MODEL_API_KEY for real image feedback"],
        teachingPoint: "[MOCK] Use a systematic approach: describe before you diagnose.",
        imageMismatch: false,
      });
    }
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
