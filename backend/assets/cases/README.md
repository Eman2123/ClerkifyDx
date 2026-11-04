# Case images

Visual cases in `backend/src/cases.ts` stay hidden until their image file exists here.

| File | Needed image | Must show (see `findings` in cases.ts) |
|---|---|---|
| `case-img-a.jpg` | Frontal chest X-ray with unilateral lobar consolidation | Consolidation in one lobe/zone, air bronchograms, no large effusion or pneumothorax |
| `case-img-b.jpg` | Photo of a measles-type rash in a child | Red blotchy maculopapular rash, confluent in places, on face and/or trunk |

Rules:
- Only use images you have the right to use (public domain / CC licence, e.g. Wikimedia Commons) and **update `credit`** in cases.ts with source + licence. Never use identifiable patients without consent.
- If you swap in a different image, **edit `findings`** so they match what is truly visible. The AI also flags a likely mismatch (`imageMismatch`).
- Keep file names neutral (the URL is visible to students).
- JPG/PNG/WebP, ideally under 1 MB.
