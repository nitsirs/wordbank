# Project state — arnork / บัญชีคำ

The reading-practice app for ครูกาญ (กาญจนา สิริรัตนชัยกุล, โรงเรียนวัดโสมนัส). Personal project (Tong), not Lead+D Lab.

## Live
- **arnork.com** — the combined app, deployed via Vercel from `main`.
- Stack: Next.js 15.5.22, Firebase (current DB), Azure Speech (TTS), ts-fsrs (spaced repetition).
- Routes: `/` (landing → username → FSRS quiz), `/quiz` (color-coded FSRS practice), `/practice/p1` (739 curated color words + spelling-out audio), `/dashboardteacher`, `/dailyprogress`, `/instructions`.
- `wordbank-kappa.vercel.app` still serves the same build (canonical-redirect polish TBD). `www.arnork.com` → 308 → `arnork.com`.

## What's done
- **Color engine merged**: `utils/thaiColor.ts` (auto-classifier) + `components/ColoredWord.tsx` — your mom's 4-color scheme (consonant black / vowel red / coda blue / tone green) applied across the quiz (auto) and the curated ป.1 set (ground truth).
- **RT benchmark** as the north-star KPI → `docs/RT-BENCHMARK.md` (RT = 100: oral reading 50 + comprehension 50; app trains ~20/100 today).
- **Gamification**: `.claude/skills/gamification-design/SKILL.md` (Octalysis, source-grounded) + `.claude/agents/yu-kai-chou.md` (red-team agent). Intrinsic-first; leaderboards team-only; CD3 creativity is the Endgame engine.

## Next (priority order, RT-driven)
1. **Supabase migration** (greenlit: Vercel + Supabase) — relational schema (students, the 11 RT word-characteristic tags, review events, oral-reading attempts, fluency metrics, comprehension responses, projected-RT). Migrate existing Firebase progress. **Gated on a Supabase access token.**
2. **ASR read-aloud** (biggest score-mover, 50 pts) — Azure Pronunciation Assessment if th-TH supports it, else Thai STT + our own accuracy/WCPM scoring. **Gated on Azure Speech key + region. Skipped for now.**
3. **Comprehension module** (the other 50 pts) — picture-word match + 3-choice MC by indicator.
4. **Unify landing + mode switch** (`/quiz` vs `/practice/p1` as one app) + fold the ป.1 set into one student progression.
5. **Gamification features** — design via the skill + agent (classroom group mode, rewards, Endgame).

## Deferred / open
- **Rotate 5 chat-exposed tokens** (3 CF arnork + 1 CF leaddlab + 1 Vercel). Create fresh, update mini, revoke old.
- **bit.ly/บัญชีคำ repoint** → arnork.com (Tong + ครูกาญ handling in bitly).
- **QR codes** in ครูกาญ's materials → regenerate to arnork.com.
- **Part 2 mode** (home/parent practice) — assumed yes, unconfirmed.

## Credentials (on Mac mini `nitsirs@100.122.205.30`)
- `~/.config/wordbank/env` (chmod 600, not in repo): `ARNORK_CLOUDFLARE_API_TOKEN`, `VERCEL_TOKEN`. arnork zone `334b128137493fa29b8c1a2851b7dd9d`; wordbank Vercel project `prj_BCY73xgNsQm0nTynV9Ox5QyU0UkE`.
- Lab creds (leaddlab) separately in `~/.config/poomjai-bot/env`.
- Local clone: `~/Desktop/kru-kan/wordbank` (ThinkPad) — git identity set repo-local.

## Vercel build gotcha (do not regress)
Vercel blocks deploys of vulnerable Next.js versions. Keep Next on the latest patched 15.x (currently 15.5.22). A `next build` passing locally does NOT mean Vercel will accept it — check the Vercel deployment `readyState` after pushing.
