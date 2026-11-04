# ClerkifyDx

AI-powered digital health platform: clinical case simulation for medical students and interns, plus AI-assisted patient intake for clinician review. Built for Nigeria (English + Nigerian Pidgin) with **Meta Llama** models.

> Prototype for a hackathon. Not a medical device. AI output is educational / preliminary and never a diagnosis.

## Stack
- **Backend:** Node.js 22+, Express, TypeScript, Zod, SQLite, JWT, Meta Llama (OpenAI-compatible endpoint)
- **Frontend:** React, Vite, TypeScript

## Features
- **Student simulation:** pick a case, interview an AI patient (stays in character, reveals history only when asked), submit clerking, get structured Llama feedback (strengths, omissions, red flags, reasoning).
- **Patient intake:** consent first, one-question-at-a-time AI intake, structured record for a clinician. A deterministic red-flag check runs *before* the LLM, so emergency guidance never depends on AI availability.
- **Languages:** English and Nigerian Pidgin.
- **Accounts & roles:** JWT auth (bcrypt), roles student/intern/patient/doctor/admin, role-based access, rate limiting, helmet. Doctors start unverified (pending credential check). Patient intake works without an account so emergency guidance is never blocked.
- **Persistence & learning history:** SQLite (Node 22 built-in driver). Sessions, transcripts, feedback and records are stored per user; `/api/me/learning` shows progress and recurring omissions.

## Quick start
```bash
npm install
cp backend/.env.example backend/.env   # add LLAMA_API_KEY and a long random JWT_SECRET
npm run dev:backend    # http://localhost:4000
npm run dev:frontend   # http://localhost:5173
```
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
| GET | `/api/cases` | list cases |
| POST | `/api/simulation/start` | start a session |
| POST | `/api/simulation/:id/message` | ask the AI patient |
| POST | `/api/simulation/:id/submit` | get feedback |
| POST | `/api/triage/start` | consent + start intake |
| POST | `/api/triage/:id/message` | intake chat (red-flag screened) |
| POST | `/api/triage/:id/record` | structured clinician summary |

## Roadmap
Admin verification of doctors, Postgres, clinician verification, patient-to-doctor connection, payments, clinically reviewed case library, clinician-approved triage protocols.
