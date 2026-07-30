# Project state — arnork / บัญชีคำ

The reading-practice app for ครูกาญ (กาญจนา สิริรัตนชัยกุล, โรงเรียนวัดโสมนัส). Personal project (Tong), not Lead+D Lab.

## Live
- **arnork.com** — the combined app, deployed via Vercel from `main`.
- Stack: Next.js 15.5.22, **Supabase Postgres (DB, anon auth + RLS)**, Azure Speech (TTS), ts-fsrs (spaced repetition). Firebase RTDB retained read-only as a 2-week backup only.
- Routes: `/` (landing → username → FSRS quiz), `/quiz` (color-coded FSRS practice), `/practice/p1` (739 curated color words + always-on ASR auto-tick), `/practice/sentence` (sentence reading → PA 0-3), `/leaderboard` (global XP rank + my level/streak/badges), `/classroom` (create/join by code → class leaderboard), `/dashboardteacher`, `/dailyprogress`, `/instructions`. API: `/api/speech-token`, `/api/leaderboard`, `/api/score-sentence`.
- `wordbank-kappa.vercel.app` still serves the same build (canonical-redirect polish TBD). `www.arnork.com` → 308 → `arnork.com`.

## What's done
- **Color engine merged**: `utils/thaiColor.ts` (auto-classifier) + `components/ColoredWord.tsx` — your mom's 4-color scheme (consonant black / vowel red / coda blue / tone green) applied across the quiz (auto) and the curated ป.1 set (ground truth).
- **RT benchmark** as the north-star KPI → `docs/RT-BENCHMARK.md` (RT = 100: oral reading 50 + comprehension 50; app trains ~20/100 today).
- **Gamification**: `.claude/skills/gamification-design/SKILL.md` (Octalysis, source-grounded) + `.claude/agents/yu-kai-chou.md` (red-team agent). Intrinsic-first; leaderboards team-only; CD3 creativity is the Endgame engine.
- **Supabase migration LIVE (2026-07-30)**: optimized schema (`word_bank` + sparse `student_cards` + append-only `review_events` + `student_daily_stats` view) kills the old redundancy; anon auth + 8 RLS policies (open-Firebase hole closed); 5 RPCs (`next_card`, `submitReview` path, `adopt_legacy`, `class_progress`, `my_daily_stats`). 180 students / 45,133 cards ported via idempotent `scripts/migrate_firebase_to_supabase.mjs`. Bundle verified supabase + project ref, zero firebase. Cutover post-mortem: `~/Desktop/PoomJAI/personal/tong/notes/handoff-wordbank-supabase-cutover-2026-07-30.md` (2 script bugs caught + fixed by the cutover terminal).

## Overnight build (2026-07-31) — ASR + gamification + classroom, LIVE
- **Azure Speech unblocked**: dead hardcoded key removed from `services/azureSpeechService.ts` → env (`AZURE_SPEECH_KEY`/`AZURE_SPEECH_REGION=westus3`, resource `nitsir-9747-resource`, AIServices). Key live in `.env.local` + mini `~/.config/wordbank/env`.
- **Always-on ASR auto-tick** on `/practice/p1`: "เริ่มฟัง" → continuous th-TH STT (browser, token auth via `/api/speech-token` so key stays server-side) → dictionary-constrained longest-match + fuzzy (`lib/thaiSegment`, 8 unit tests) → auto ✔/advance. Phantom-tick-safe (ตา won't fire on ตาก).
- **Sentence reading** `/practice/sentence` → `/api/score-sentence` → server-side Pronunciation Assessment → RT 0-3 (`lib/scoreRubric`, thresholds 85/70/50). Calibrated (3 TTS sentences → grade 3). Note: Thai PA returns no per-word breakdown.
- **Gamification** (`lib/gamify`): XP/level/streak/badges (Octalysis drives 2/4/6/8). Shown on `/leaderboard` my-card.
- **Leaderboard** `/leaderboard` + `/api/leaderboard`: service-role aggregate of `review_events` → global XP rank (drive 5).
- **Classroom + groups** `/classroom` (drive 5): migration APPLIED to prod (`scripts/sql/classrooms.sql` — `classrooms`, `classroom_members`, RLS, `class_leaderboard` RPC). Teacher creates (5-char code) / students join / class leaderboard.
- **Budget**: Azure consumption budget `wordbank-cap-500` (alerts 50/80/100% → nitsir@outlook.com). PAYG, alert-only.
- **`docs/PRODUCT-VISION.md`** (Simple View of Reading × Octalysis × SDT/Flow) + **`docs/COMPREHENSION-DESIGN.md`** (scaffold for the other 50 pts).
- **NOT deployed to prod ASR**: Azure env vars intentionally left OFF Vercel → `/api/speech-token` 500s in prod → no untested ASR on live kids + no open-endpoint abuse while Tong sleeps. Add env vars after real-voice validation.

## Next (priority order, RT-driven)
1. **Validate ASR on a real kid voice** (manual) — test the always-on auto-tick + sentence 0-3 on real speech; tune the matcher / thresholds. Then add `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION` to Vercel to take ASR live. Confirm the 0-3 rubric against the official RT PDF.
2. **Migration UAT** (manual, ~2 min) — log in at arnork.com with an existing nickname to confirm `adopt_legacy` reclaimed FSRS progress; do one review (✖/✔); eyeball `/dashboardteacher`. Then Firebase can be retired after 2 weeks stable.
3. **Comprehension module** (the other 50 pts) — build per `docs/COMPREHENSION-DESIGN.md` (word-meaning + sentence-comp first, then text-comp, then picture-retell).
4. **Unify landing + mode switch** (`/quiz` vs `/practice/p1` as one app) + fold the ป.1 set into one student progression.
5. **Gamification polish + safety** — repeated-reading cycles, drive 1/3/7 events; **gate `/api/speech-token`** (auth/origin) before public scale; WCPM metric (parked per Tong).
6. **นวัตกรรม authoring workflow** for ครูกาญ's ค.8 promotion — goal spec at `~/Desktop/PoomJAI/personal/tong/innovation-writeup/GOAL.md` (run on the M3/GLM fleet like Gen Z/Mind-the-Gap).

## Deferred / open
- **Rotate 6 chat-exposed tokens** (3 CF arnork + 1 CF leaddlab + Vercel + Supabase). Create fresh, update the mini env, revoke old. Also: a duplicate old user-scope Supabase MCP (stdivo, Unauthorized) — remove via `claude mcp remove supabase --scope user` so only the new HTTP one is active.
- **bit.ly/บัญชีคำ repoint** → arnork.com (Tong + ครูกาญ handling in bitly).
- **QR codes** in ครูกาญ's materials → regenerate to arnork.com.
- **Part 2 mode** (home/parent practice) — assumed yes, unconfirmed.

## Credentials (on Mac mini `nitsirs@100.122.205.30`)
- `~/.config/wordbank/env` (chmod 600, not in repo): `ARNORK_CLOUDFLARE_API_TOKEN`, `VERCEL_TOKEN`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`. arnork CF zone `334b128137493fa29b8c1a2851b7dd9d`; wordbank Vercel project `prj_BCY73xgNsQm0nTynV9Ox5QyU0UkE`; Supabase project `arnork` ref `vmltwkemcwdjblxgjrnb` (ap-southeast-1).
- Supabase MCP (HTTP, full features) added to PoomJAI `.mcp.json` — activates after session restart + OAuth.
- Lab creds (leaddlab) separately in `~/.config/poomjai-bot/env`.
- Local clone: `~/Desktop/kru-kan/wordbank` (ThinkPad) — git identity set repo-local.

## Vercel build gotcha (do not regress)
Vercel blocks deploys of vulnerable Next.js versions. Keep Next on the latest patched 15.x (currently 15.5.22). A `next build` passing locally does NOT mean Vercel will accept it — check the Vercel deployment `readyState` after pushing.
