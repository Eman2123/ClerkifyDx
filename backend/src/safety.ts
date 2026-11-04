/**
 * Deterministic red-flag screening for the patient triage flow.
 * Runs BEFORE any LLM call so emergency guidance never depends on AI availability.
 * NOTE: prototype keyword list. Must be replaced by clinician-reviewed protocols before real use.
 */
const EMERGENCY_PATTERNS: RegExp[] = [
  /can'?t breathe|cannot breathe|difficulty breathing|struggling to breathe|shortness of breath at rest/i,
  /chest pain|crushing pain/i,
  /unconscious|passed out|collapsed|not waking|unresponsive/i,
  /seizure|convulsion|fitting/i,
  /severe bleeding|heavy bleeding|bleeding (a lot|heavily)|vomiting blood|coughing (up )?blood/i,
  /face drooping|slurred speech|sudden weakness|one side (of the body )?weak/i,
  /suicid|kill myself|end my life/i,
  /pregnan.*(bleeding|severe pain|convuls)|(bleeding|convuls).*pregnan/i,
  // Nigerian Pidgin
  /i no fit breathe|breath dey hard me|no dey breathe well/i,
  /blood dey comot plenty|plenty blood/i,
  /e don faint|dem faint|no dey wake|body dey shake/i,
  /chest dey pain me|e dey pain me for chest/i,
  /pikin (no dey wake|dey shake|don faint)|dey (convulse|faint)|dey vomit blood|blood dey comot|i wan (die|kill myself)/i,
];

export function detectEmergency(text: string): boolean {
  return EMERGENCY_PATTERNS.some((p) => p.test(text));
}

export const EMERGENCY_MESSAGE = {
  en: "Your symptoms may be a medical emergency. Please go to the nearest hospital emergency department or call your local emergency number NOW. Do not wait to finish this chat. If possible, ask someone nearby to go with you. ClerkifyDx cannot call an ambulance for you.",
  pcm: "Wetin you talk fit be emergency. Abeg run go the hospital emergency room wey near you or call emergency number NOW. No wait finish this chat. If person dey near you, ask am make e follow you go. ClerkifyDx no fit call ambulance for you.",
} as const;

export const AI_DISCLAIMER = {
  en: "I am an AI assistant, not a doctor. I help collect your information for a qualified clinician. I cannot diagnose you.",
  pcm: "I be AI assistant, no be doctor. I dey help collect your information for qualified doctor. I no fit diagnose you.",
} as const;
