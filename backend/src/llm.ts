import { config } from "./config.js";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
}

/** Calls a Meta Llama model through an OpenAI-compatible chat completions endpoint. */
export async function chat(messages: ChatMessage[], opts: CompletionOptions = {}): Promise<string> {
  if (config.llama.mock) return mockReply(messages, opts);

  const res = await fetch(`${config.llama.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.llama.apiKey}`,
    },
    body: JSON.stringify({
      model: config.llama.model,
      messages,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? 800,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Llama API error ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string | { text?: string } } }[];
    completion_message?: { content?: { text?: string } | string };
  };
  // Standard OpenAI shape, with a fallback for the native Llama API shape.
  const raw = data.choices?.[0]?.message?.content ?? data.completion_message?.content;
  const text = typeof raw === "string" ? raw : raw?.text;
  if (!text) throw new Error("Llama API returned an empty response");
  return text.trim();
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
        overallSummary: "[MOCK] Good start. Set LLAMA_API_KEY for real AI feedback.",
        strengths: ["Asked about the presenting complaint"],
        missed: [{ item: "Associated symptoms", whyItMatters: "Narrows the differential diagnosis." }],
        reasoningFeedback: "[MOCK] Link findings to each differential.",
        redFlagsMissed: [],
        diagnosisAssessment: "partially_supported",
        improvements: ["Use a structured history framework"],
        suggestedStudy: ["Fever in children"],
      });
    }
    return JSON.stringify({ summary: "[MOCK] summary", reply: "[MOCK] Please configure LLAMA_API_KEY." });
  }
  return "[MOCK] Llama is not configured. Set LLAMA_API_KEY in backend/.env to enable live AI responses.";
}
