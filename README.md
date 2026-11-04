# ClerkifyDx

AI-powered digital health platform: clinical case simulation for medical students and interns, plus AI-assisted patient intake for clinician review. Built for Nigeria (English + Nigerian Pidgin) with **Meta Llama** models.

> Prototype for a hackathon. Not a medical device. AI output is educational / preliminary and never a diagnosis.

## Stack
- **Backend:** Node.js, Express, TypeScript, Zod, Meta Llama (OpenAI-compatible endpoint)
- **Frontend:** React, Vite, TypeScript

## Features
- **Student simulation:** pick a case, interview an AI patient (stays in character, reveals history only when asked), submit clerking, get structured Llama feedback (strengths, omissions, red flags, reasoning).
- **Patient intake:** consent first, one-question-at-a-time AI intake, structured record for a clinician. A deterministic red-flag check runs *before* the LLM, so emergency guidance never depends on AI availability.
- **Languages:** English and Nigerian Pidgin.

## Quick start
```bash
npm install
cp backend/.env.example backend/.env   # add LLAMA_API_KEY
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
| GET | `/api/cases` | list cases |
| POST | `/api/simulation/start` | start a session |
| POST | `/api/simulation/:id/message` | ask the AI patient |
| POST | `/api/simulation/:id/submit` | get feedback |
| POST | `/api/triage/start` | consent + start intake |
| POST | `/api/triage/:id/message` | intake chat (red-flag screened) |
| POST | `/api/triage/:id/record` | structured clinician summary |

## Roadmap
Auth and roles, database, clinician verification, patient-to-doctor connection, payments, clinically reviewed case library, clinician-approved triage protocols.
