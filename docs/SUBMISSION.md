# Submission form: draft answers

Replace [brackets]. Adjust lengths to each field's limit. Be honest: judges check the live demo and the repo.

**Project name:** ClerkifyDx

**Tagline (one line):** Practise clerking on an AI patient, and get safe, structured intake before you see a doctor, built on Meta Muse Spark.

**Track:** Indie developer (solo student builder).

**Theme fit ("Build for Your World"):** [1-2 sentences from your own experience as a medical student in [country]: learning on real patients with little feedback; crowded clinics; Pidgin-speaking patients.]

**Problem:** Medical students often learn history-taking directly on patients with little structured feedback. Patients often reach a clinic with no organised history, and emergencies can wait in the same queue as routine cases. Many patients are most comfortable in Nigerian Pidgin.

**What it does:**
1. Students and interns clerk an AI patient (11 text cases, English and Nigerian Pidgin), then get structured feedback on strengths, omissions, missed red flags and reasoning, plus a learning history of recurring gaps.
2. Visual cases: the learner reads an X-ray or clinical photo and Muse Spark (vision) critiques the reading. [Say this only if you added the images.]
3. Patients complete a consented, one-question-at-a-time intake. A deterministic red-flag check runs before the LLM. The result is a structured summary for a clinician, never a diagnosis.
4. Patients can request a verified doctor; the doctor sees the summary only after accepting, and only then can they chat. Statuses never claim a review before it happened.

**How we use Meta's models:** Muse Spark 1.3 through the Meta Model API (OpenAI-compatible Chat Completions) for the AI patient, clerking feedback, patient intake, structured JSON outputs, and image understanding for visual cases. We use the Standard-mode model ID so prompts are not used for training. [Add anything else you actually use.]

**Technical highlights:** TypeScript monorepo; Express + Zod; Postgres (Neon); JWT + bcrypt; role-based access; rate limiting and helmet; one LLM client with mock mode and a tolerant JSON parser; rule-based safety layer independent of the model; image-mismatch guard on visual cases; single-project Vercel deployment (static frontend + serverless API) with Neon Postgres.

**Challenges:** [e.g. keeping the AI patient from volunteering history or naming the diagnosis; making emergency handling independent of the LLM; getting reliable structured JSON from the model.]

**What we're proud of:** The safety design: emergency guidance and consultation status are deterministic and honest, so the AI can be wrong without putting a patient at risk.

**What we learned:** [Your own words.]

**What's next:** Upgrade the consultation chat (currently polling) to WebSockets and video; clinically reviewed case library and red-flag rules; voice intake with Muse Voice Transcribe; more languages; appointment scheduling.

**Limitations (be upfront):** Prototype, not a medical device, not clinically validated. Cases are not yet reviewed by a clinical panel. Pidgin quality is not evaluated with native-speaker clinicians. Doctor verification is a manual admin check.

**Links:** Repo: https://github.com/Eman2123/ClerkifyDx (MIT) | Live demo: [Vercel URL] | Video: [URL]
