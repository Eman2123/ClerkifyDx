import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chatVision, parseJson } from "./llm.js";
import type { ClinicalCase, Language } from "./cases.js";

const dir = new URL("../assets/cases/", import.meta.url);
const pathOf = (file: string) => fileURLToPath(new URL(file, dir));

/** A case with an image is only offered once its image file exists on disk. */
export const caseAvailable = (c: ClinicalCase) => !c.image || existsSync(pathOf(c.image.file));

export const publicImage = (c: ClinicalCase) =>
  c.image && caseAvailable(c)
    ? { url: `/api/case-images/${c.image.file}`, modality: c.image.modality, alt: c.image.alt, credit: c.image.credit }
    : undefined;

const MIME: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

export function imageFilePath(file: string): string | null {
  const p = pathOf(file);
  return existsSync(p) ? p : null;
}

function imageDataUrl(file: string): string {
  const ext = file.split(".").pop()?.toLowerCase() ?? "jpg";
  return `data:${MIME[ext] ?? "image/jpeg"};base64,${readFileSync(pathOf(file)).toString("base64")}`;
}

export interface ImageReading {
  rating: "good" | "partial" | "needs_work";
  correct: string[];
  missed: string[];
  teachingPoint: string;
  /** True when the model thinks the image does not show the reference findings (guards against a wrong image file). */
  imageMismatch: boolean;
}

/** Muse Spark (vision) compares the learner's reading of the image against hidden reference findings. */
export async function readImage(c: ClinicalCase, interpretation: string, lang: Language): Promise<ImageReading> {
  if (!c.image) throw new Error("Case has no image");
  const system = `You are a clinical educator giving educational feedback on a learner's image interpretation of a SIMULATED teaching case. ${
    lang === "pcm" ? "Reply in simple Nigerian Pidgin English." : "Reply in simple, clear English."
  }
Look at the image yourself. Judge the learner's description against the image and the reference findings. Be constructive and concise. Do not invent findings you cannot see. This is a learning aid, not a diagnosis.
If the image clearly does NOT show the reference findings, set imageMismatch to true.

Return ONLY a JSON object with keys: rating ("good"|"partial"|"needs_work"), correct (string[]), missed (string[]), teachingPoint (string), imageMismatch (boolean).

Modality: ${c.image.modality}
Reference findings (hidden from learner): ${c.image.findings.join("; ")}`;
  const raw = await chatVision(system, `LEARNER'S INTERPRETATION:\n${interpretation}`, imageDataUrl(c.image.file), {
    json: true,
    temperature: 0.2,
    maxTokens: 700,
  });
  const r = parseJson<Partial<ImageReading>>(raw);
  return {
    rating: r.rating ?? "partial",
    correct: r.correct ?? [],
    missed: r.missed ?? [],
    teachingPoint: r.teachingPoint ?? "",
    imageMismatch: !!r.imageMismatch,
  };
}
