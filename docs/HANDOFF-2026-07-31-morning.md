# Morning handoff — 2026-07-31 (overnight build)

You slept; I built. Everything committed to `main` (8 commits). Build green throughout.

## What's LIVE (works now, on localhost + the non-ASR parts on arnork.com)
- **Always-on ASR auto-tick** on `/practice/p1` — "เริ่มฟัง" → mic → continuous th-TH STT → dictionary + fuzzy match → auto ✔. Key stays server-side (token auth).
- **Sentence reading** `/practice/sentence` → PA → RT 0-3 + skill tiles (accuracy/fluency/completeness).
- **Leaderboard** `/leaderboard` — global XP rank + your level/XP bar/streak/badges.
- **Gamification** — XP, levels (6 titles), daily streak, 7 milestone badges (Octalysis drives 2/4/5/6/8).
- **Classroom** `/classroom` — teacher creates a 5-char code, students join, class leaderboard. **Migration applied to prod Supabase** (classrooms, members, RLS, class_leaderboard RPC).
- **Hardened ASR matcher** (`lib/thaiSegment`, 8 unit tests) — kills phantom ticks (ตา won't fire on ตาก).
- **Vision + design docs** — `PRODUCT-VISION.md` (Simple View × Octalysis × SDT/Flow), `COMPREHENSION-DESIGN.md`.

## What needs YOU (in priority order)
1. **Test ASR on a real kid voice** (or yours) at `localhost:3000/practice/p1` + `/practice/sentence`. The always-on tick + 0-3 are TTS-validated only; real speech may need matcher/threshold tuning. This is the one thing I couldn't do headless.
2. **Take ASR live**: add `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION` (westus3) to Vercel → the ASR features activate on arnork.com. (I left them OFF on purpose so no untested ASR shipped to kids + the token endpoint is inert in prod.)
3. **Confirm the 0-3 sentence rubric** against the official RT PDF — my thresholds (PronScore 85/70/50) are a guess.
4. **Classroom RLS is permissive by design** (anyone can create a class / self-join). Fine for a pilot; tighten before real classrooms.

## Safety / what I did NOT do
- No deploys, no force-push, no destructive ops, no PoomJAI files touched.
- Azure spend capped: budget `wordbank-cap-500` (alerts 50/80/100% → nitsir@outlook.com). Calibration was ~6 PA calls total.
- `/api/speech-token` is OPEN — gate it (auth/origin) before public scale. It's inert in prod until you add the Vercel env vars.

## Known limitations
- Thai PA returns **no per-word breakdown** — the sentence chips render empty; overall 0-3 + skill scores are the real output.
- WCPM parked (your call).
- Comprehension module is a design doc only (not built).
- Sentence demo set is 8 hardcoded sentences — needs the real RT bank / a seeded table.

## Commits (main)
key-to-env · p1 redesign (fixed/flip/roll) · always-on ASR · vision+matcher · leaderboard+gamification · sentence PA · classroom · (docs)

— น้อง Claude, overnight
