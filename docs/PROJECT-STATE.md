# Project state — arnork / บัญชีคำ

The reading-practice app for ครูกาญ (กาญจนา สิริรัตนชัยกุล, โรงเรียนวัดโสมนัส). Personal project (Tong), not Lead+D Lab.

## Live
- **arnork.com** — the combined app, deployed via Vercel from `main`.
- Stack: Next.js 15.5.22, **Supabase Postgres (DB, anon auth + RLS)**, Azure Speech (TTS), ts-fsrs (spaced repetition). Firebase RTDB retained read-only as a 2-week backup only.
- Routes: `/` (landing → username → FSRS quiz), `/quiz` (color-coded FSRS practice), `/practice/p1` (739 curated color words + spelling-out audio), `/dashboardteacher`, `/dailyprogress`, `/instructions`.
- `wordbank-kappa.vercel.app` still serves the same build (canonical-redirect polish TBD). `www.arnork.com` → 308 → `arnork.com`.

## What's done
- **Color engine merged**: `utils/thaiColor.ts` (auto-classifier) + `components/ColoredWord.tsx` — your mom's 4-color scheme (consonant black / vowel red / coda blue / tone green) applied across the quiz (auto) and the curated ป.1 set (ground truth).
- **RT benchmark** as the north-star KPI → `docs/RT-BENCHMARK.md` (RT = 100: oral reading 50 + comprehension 50; app trains ~20/100 today).
- **Gamification**: `.claude/skills/gamification-design/SKILL.md` (Octalysis, source-grounded) + `.claude/agents/yu-kai-chou.md` (red-team agent). Intrinsic-first; leaderboards team-only; CD3 creativity is the Endgame engine.
- **Supabase migration LIVE (2026-07-30)**: optimized schema (`word_bank` + sparse `student_cards` + append-only `review_events` + `student_daily_stats` view) kills the old redundancy; anon auth + 8 RLS policies (open-Firebase hole closed); 5 RPCs (`next_card`, `submitReview` path, `adopt_legacy`, `class_progress`, `my_daily_stats`). 180 students / 45,133 cards ported via idempotent `scripts/migrate_firebase_to_supabase.mjs`. Bundle verified supabase + project ref, zero firebase. Cutover post-mortem: `~/Desktop/PoomJAI/personal/tong/notes/handoff-wordbank-supabase-cutover-2026-07-30.md` (2 script bugs caught + fixed by the cutover terminal).

## Next (priority order, RT-driven)
1. **Migration UAT** (manual, ~2 min) — log in at arnork.com with an existing nickname to confirm `adopt_legacy` reclaimed FSRS progress; do one review (✖/✔); eyeball `/dashboardteacher`. Then Firebase can be retired after 2 weeks stable.
2. **ASR read-aloud** (biggest score-mover, 50 pts) — Azure Pronunciation Assessment if th-TH supports it, else Thai STT + our own accuracy/WCPM scoring. **Gated on Azure Speech key + region.**
3. **Comprehension module** (the other 50 pts) — picture-word match + 3-choice MC by indicator.
4. **Unify landing + mode switch** (`/quiz` vs `/practice/p1` as one app) + fold the ป.1 set into one student progression.
5. **Gamification features** — design via the skill + agent (classroom group mode, rewards, Endgame).
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
