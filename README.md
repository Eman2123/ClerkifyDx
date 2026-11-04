# ClerkifyDx

**AI clinical-skills practice for medical students, and safe AI-assisted intake for patients, built on Meta's Muse Spark.**
Built for Nigeria: English + Nigerian Pidgin.

> Hackathon prototype (Meta Global AI Developer Hackathon, "Build for Your World"). **Not a medical device.** The AI never diagnoses. AI output is educational or preliminary and is always meant for clinician review.

## The problem
In many Nigerian medical schools and teaching hospitals, students learn history-taking and clerking on busy wards with little one-to-one feedback, so a lot of practice happens on real patients before a student is ready. At the same time, patients often arrive at an overstretched clinic with no structured history, and some who need emergency care wait in the same queue as everyone else. Language is a further barrier: many patients are most comfortable in Nigerian Pidgin.

ClerkifyDx tackles both sides:
1. **Students and interns** practice clerking on an AI patient that stays in character and only reveals history when asked, then get structured feedback on what they missed.
2. **Patients** describe their problem in English or Pidgin, one question at a time. A **deterministic red-flag check runs before any AI call**, so emergency guidance never depends on an LLM or the network. A structured summary can then be shared with a verified doctor, who sees it only after accepting the request.

## How Meta models are used
| Where | Model | What it does |
|---|---|---|
| AI patient (`backend/src/simulation.ts`) | `muse-spark-1.3` via Meta Model API | Role-plays the patient from a hidden case script; reveals history only when asked |
| Clerking feedback | `muse-spark-1.3` | Structured JSON feedback: strengths, omissions, missed red flags, reasoning |
| Patient intake (`backend/src/triage.ts`) | `muse-spark-1.3` | One-question-at-a-time intake in English / Pidgin; structured record for a clinician |

All calls go through one small client, `backend/src/llm.ts`, using the Meta Model API's OpenAI-compatible Chat Completions endpoint (`https://api.meta.ai/v1/chat/completions`). We use the Standard-mode model ID (`muse-spark-1.3`), not the `-contributor` variant, so prompts are not used for training, which matters for patient-style data.

## Safety design
- The AI never gives a diagnosis to patients; intake output is a summary for clinician review.
- Emergency detection (`backend/src/safety.ts`) is rule-based and runs **before** the LLM. Emergency intakes cannot be turned into an online consultation.
- Consultation statuses are honest and never skip ahead: `requested` -> `accepted` / `declined` -> `completed`, or `cancelled`. Nothing claims a doctor reviewed a case before they did.
- Doctors start unverified; an admin approves them. Only verified doctors are listed.
- Auth: bcrypt + JWT, role-based access, rate limiting, helmet, Zod input validation.

## Architecture
```
React + Vite (frontend)  --/api-->  Express + TypeScript (backend)
                                      |-- auth / roles / consultations   -> SQLite (node:sqlite)
                                      |-- safety.ts  (rule-based red flags, runs first)
                                      |-- llm.ts     -> Meta Model API (Muse Spark)  [mock mode if no key]
```
TypeScript monorepo (npm workspaces): `backend/`, `frontend/`.

## Setup
Requires Node.js 22+.
```bash
npm install
cp backend/.env.example backend/.env   # set MODEL_API_KEY and a long random JWT_SECRET
npm run seed                            # demo accounts (local only)
npm run dev:backend                     # http://localhost:4000
npm run dev:frontend                    # http://localhost:5173
```
Get a Meta Model API key at <https://dev.meta.ai> (API keys tab). **Never commit it**: `backend/.env` is git-ignored.

Without `MODEL_API_KEY` (or with `MOCK_LLM=true`) the backend runs in **mock mode** with canned replies so the UI can be explored.

| Env var | Default | Purpose |
|---|---|---|
| `MODEL_API_KEY` | none | Meta Model API key |
| `MODEL_API_BASE_URL` | `https://api.meta.ai/v1` | API base URL |
| `MODEL_NAME` | `muse-spark-1.3` | Model ID |
| `MODEL_REASONING_EFFORT` | unset | Optional reasoning level |
| `JWT_SECRET` | dev placeholder | **Set in production** |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | unset | Creates the first admin on startup |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend origin |

### Demo accounts
`npm run seed` creates (password `Demo12345`): `student@clerkifydx.demo`, `intern@clerkifydx.demo`, `patient@clerkifydx.demo`, `doctor@clerkifydx.demo`. The seed script refuses to run when `NODE_ENV=production`. Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` first to also get an admin.

## Features
- 9 seed cases across Paediatrics, Obstetrics, Surgery and Internal Medicine, with department and difficulty filters
- AI patient simulation, then structured feedback; learning history with recurring omissions (`/api/me/learning`)
- Patient intake with consent, English + Nigerian Pidgin, structured clinician summary
- Doctor verification (MDCN number + specialty, admin review)
- Consultation requests; the doctor sees the patient summary only after accepting

## API
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | status, model |
| POST | `/api/auth/register`, `/api/auth/login` | accounts |
| GET | `/api/auth/me` | current user |
| GET | `/api/me/learning` | learning history (student/intern) |
| GET | `/api/me/records` | saved intake records (patient) |
| GET | `/api/cases` | list cases |
| POST | `/api/simulation/start` | start a session |
| POST | `/api/simulation/:id/message` | ask the AI patient |
| POST | `/api/simulation/:id/submit` | get feedback |
| GET | `/api/simulation/:id` | resume/review a past case |
| POST | `/api/triage/start` | consent + start intake |
| POST | `/api/triage/:id/message` | intake chat (red-flag screened) |
| POST | `/api/triage/:id/record` | structured clinician summary |
| POST/GET | `/api/doctor/profile` | doctor submits/reads verification details |
| GET/POST | `/api/admin/doctors`, `/api/admin/doctors/:id/review` | admin verification |
| GET | `/api/doctors` | verified doctor directory (patients) |
| POST/GET | `/api/consultations` | request / list consultations |
| POST | `/api/consultations/:id/respond` | doctor accept / decline / complete |
| POST | `/api/consultations/:id/cancel` | patient cancels |

## Honest limitations
- Prototype, not a medical device and not clinically validated. Cases and red-flag rules are not yet reviewed by a clinical panel.
- AI patient and feedback quality depend on the model and can be wrong; feedback is educational only.
- No real-time chat or video yet; "accepted" consultations do not yet have a communication channel.
- SQLite is fine for a demo, not for multi-instance production.
- Pidgin support is prompt-based and has not been evaluated with native-speaker clinicians.
- Doctor verification is a manual admin check of a self-reported MDCN number; there is no registry lookup.

## Roadmap
Real-time chat for accepted consultations, Postgres, scheduling, clinically reviewed case library and triage protocols, visual cases (images) for student interpretation, referrals to hospitals.

## License
MIT, see [LICENSE](LICENSE).
