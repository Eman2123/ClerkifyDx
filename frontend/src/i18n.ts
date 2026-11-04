import type { Language } from "./api";

const en = {
  nav_sim: "Simulation", nav_learn: "My learning", nav_intake: "Patient intake", nav_consults: "My consultations",
  footer: "Educational and information-gathering tool only. Not medical advice or a diagnosis. In an emergency go to the nearest hospital.",
  intake_title: "Tell us what is wrong",
  intake_intro: "An AI assistant asks about your symptoms one question at a time and organises your answers for a qualified doctor.",
  assure1: "It cannot diagnose you and cannot call an ambulance.",
  assure2: "Emergency warning signs are checked first, before any AI reply.",
  assure3: "A doctor sees your summary only if you choose to share it and they accept.",
  consent: "I understand and consent to my information being processed for this purpose.",
  start: "Start intake", placeholder: "Type here", send: "Send", finish: "Finish",
  summary: "Summary for clinician", complaint: "Complaint", history: "History", associated: "Associated symptoms",
  pmh: "Past history", meds: "Medications", allergies: "Allergies", unknown: "Unknown", urgency: "Preliminary urgency", none: "none reported",
  choose_case: "Choose a case", choose_sub: "Pick a department and level. The AI patient only answers what you ask, so ask well.",
  ask_ph: "Ask the patient a question", clerking: "Your clerking", hist_sum: "History summary", lead_dx: "Leading diagnosis",
  diffs: "Differentials (comma separated)", reasoning: "Reasoning (optional)", submit_fb: "Submit for feedback", new_case: "New case", feedback: "Feedback",
};
const pcm: Record<keyof typeof en, string> = {
  nav_sim: "Practice", nav_learn: "Wetin I don learn", nav_intake: "Tell us wetin dey do you", nav_consults: "My doctor talk",
  footer: "Na for learning and to collect information only. E no be medical advice or diagnosis. If emergency dey, run go the nearest hospital.",
  intake_title: "Tell us wetin dey do you",
  intake_intro: "AI assistant go ask you about wetin dey worry you, one question at a time, then e go arrange your answer for qualified doctor.",
  assure1: "E no fit tell you wetin dey sick you (diagnose) and e no fit call ambulance.",
  assure2: "We dey check emergency warning signs first, before AI reply you.",
  assure3: "Doctor go only see your summary if you gree share am and the doctor accept.",
  consent: "I don understand and I gree make dem use my information for this thing.",
  start: "Start", placeholder: "Write here", send: "Send", finish: "Finish",
  summary: "Summary for doctor", complaint: "Wetin dey do you", history: "How e start", associated: "Other things wey you dey feel",
  pmh: "Sickness wey you get before", meds: "Drugs wey you dey take", allergies: "Wetin dey make your body react (allergy)", unknown: "Wetin we no know", urgency: "How e urgent reach (first guess)", none: "nothing",
  choose_case: "Pick one case", choose_sub: "Pick department and level. The AI patient go only answer wetin you ask, so ask well-well.",
  ask_ph: "Ask the patient question", clerking: "Your clerking", hist_sum: "Summary of the history", lead_dx: "Main diagnosis",
  diffs: "Other possible diagnoses (use comma)", reasoning: "Why you think so (optional)", submit_fb: "Submit make I check am", new_case: "New case", feedback: "Feedback",
};
export const tr = (l: Language, k: keyof typeof en): string => (l === "pcm" ? pcm[k] : en[k]);
