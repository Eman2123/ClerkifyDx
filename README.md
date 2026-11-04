# ClerkifyDx

AI-powered digital health platform: clinical case simulation for medical students and interns, plus AI-assisted patient intake for clinician review. Built for Nigeria (English + Nigerian Pidgin) with **Meta Llama** models.

> Prototype for a hackathon. Not a medical device. AI output is educational / preliminary and never a diagnosis.

## Stack
- **Backend:** Node.js 22+, Express, TypeScript, Zod, SQLite, JWT, Meta Llama (OpenAI-compatible endpoint)
- **Frontend:** React, Vite, TypeScript

## Features
- **Student simulation:** pick a case from 9 seed cases (filter by department/difficulty), interview an AI patient (stays in character, reveals history only when asked), submit clerking, get structured Llama feedback (strengths, omissions, red flags, reasoning).
- **Patient intake:** consent first, one-question-at-a-time AI intake, structured record for a clinician. A deterministic red-flag check runs *before* the LLM, so emergency guidance never depends on AI availability.
- **Languages:** English and Nigerian Pidgin.
- **Accounts & roles:** JWT auth (bcrypt), roles student/intern/patient/doctor/admin, role-based access, rate limiting, helmet. Doctors start unverified (pending credential check). Patient intake works without an account so emergency guidance is never blocked.
- **Persistence & learning history:** SQLite (Node 22 built-in driver). Sessions, transcripts, feedback and records are stored per user; `/api/me/learning` shows progress and recurring omissions.

- **Doctor verification:** doctors submit an MDCN number and specialty; an admin approves or rejects. Only verified doctors are listed. Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `backend/.env` to create the first admin.
- **Consultations:** a patient finishes intake, agrees to share the summary, and requests a verified doctor. Statuses are honest (`requested` -> `accepted` / `declined` -> `completed`, or `cancelled`) and never skip ahead. The doctor sees the patient summary only after accepting. Intakes flagged as emergencies cannot be turned into an online consultation.

## Quick start
```bash
npm install
cp backend/.env.example backend/.env   # add LLAMA_API_KEY and a long random JWT_SECRET
npm run dev:backend    # http://localhost:4000
npm run dev:frontend   # http://localhost:5173
```
### Demo accounts
```bash
npm run seed   # creates student, intern, patient and a verified doctor (password: Demo12345)
```
Logins: `student@clerkifydx.demo`, `intern@clerkifydx.demo`, `patient@clerkifydx.demo`, `doctor@clerkifydx.demo`. For local demos only; the script refuses to run in production. Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` first to also get an admin.

Without `LLAMA_API_KEY` the backend runs in mock mode so the UI can be demoed.

### Llama configuration
Set in `backend/.env`: `LLAMA_API_BASE_URL`, `LLAMA_API_KEY`, `LLAMA_MODEL`. Any OpenAI-compatible Llama provider works (Llama API, Together, Groq, Fireworks, OpenRouter, vLLM, Ollama).

## API
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | status, model |
| POST | `/api/auth/register`, `/api/auth/login` | accounts |
| GET | `/api/auth/me` | current user |
| GET | `/api/me/learning` | learning history (student/intern) |
| GET | `/api/me/records` | saved intake records (patient) |
| GET | `/api/simulation/:id` | resume/review a past case |
| POST/GET | `/api/doctor/profile` | doctor submits/reads verification details |
| GET/POST | `/api/admin/doctors`, `/api/admin/doctors/:id/review` | admin verification |
| GET | `/api/doctors` | verified doctor directory (patients) |
| POST/GET | `/api/consultations` | request / list consultations |
| POST | `/api/consultations/:id/respond` | doctor accept / decline / complete |
| POST | `/api/consultations/:id/cancel` | patient cancels |
| GET | `/api/cases` | list cases |
| POST | `/api/simulation/start` | start a session |
| POST | `/api/simulation/:id/message` | ask the AI patient |
| POST | `/api/simulation/:id/submit` | get feedback |
| POST | `/api/triage/start` | consent + start intake |
| POST | `/api/triage/:id/message` | intake chat (red-flag screened) |
| POST | `/api/triage/:id/record` | structured clinician summary |

## Roadmap
Postgres, real-time chat/video for consultations, scheduling, payments, referrals to hospitals, clinically reviewed case library, clinician-approved triage protocols.
