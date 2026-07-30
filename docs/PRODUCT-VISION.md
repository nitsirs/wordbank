# arnork / wordbank — Product Vision (the "big plan")

> The backbone for every feature. If a feature doesn't serve one of the pillars
> below, it doesn't ship. Grounded in established reading + motivation science,
> not vibes. Drafted 2026-07-31.

## What this is
A Thai ป.1 reading app that gets kids to reading fluency (the RT benchmark) by
making practice feel like a game they choose to play — at home or in class.

## Pillar 1 — Reading science: the Simple View of Reading
Reading comprehension = **Decoding × Language Comprehension** (Gough & Tunmer,
1986; Scarborough's Rope, 2001). The RT test is built on this split, and so are we:

- **Decoding (oral read-aloud, 50 pts)** — words + sentences read aloud, scored.
  - *Word drill* = adaptive spaced-retrieval + fluency model (Pillar 2).
  - *Sentence reading* = Pronunciation Assessment → 0-3, + (later) WCPM.
- **Comprehension (50 pts)** — word-meaning, picture-retell, sentence-comp,
  text-comp. Separate module (scaffolded, not yet built).

The two halves multiply: a kid who decodes but doesn't comprehend isn't reading.
Both must train.

## Pillar 2 — How we build decoding
- **Oral Reading Fluency + WCPM** (Curriculum-Based Measurement, Deno; DIBELS)
  is the standard metric. *Parked for now per Tong; the ASR already captures the
  raw signals (correct words, time), so WCPM is a cheap switch-on later.*
- **Repeated Reading** (Samuels, 1979) — re-read a short text to a fluency
  criterion. Sentence/passage mode should cycle passages.
- **Spaced retrieval (FSRS) + the keybr fluency model** drive the word drill.
  `lib/fluency.ts` targets the ~80% predicted-success zone — "optimally
  challenging" (GraphoGame-style). FSRS is a maintenance side input, not the driver.

## Pillar 3 — Motivation: Octalysis + SDT + Flow
Gamification that feeds real psychological needs, not cheap points-badges-leaderboards.
Mapping (Yu-kai Chou's 8 core drives + Self-Determination Theory + Flow):

| Drive | What it means here | Feature |
|---|---|---|
| 1. Epic meaning | "I'm becoming a reader" | level-up narrative, class mission |
| 2. Development & accomplishment | mastery, progress | XP, levels, badges, streaks |
| 3. Creativity & feedback | choose + see result instantly | ASR instant tick, word choices |
| 4. Ownership | my stuff | avatar, collection, my progress |
| 5. Social influence | together | **classroom, groups, leaderboard** |
| 6. Scarcity / impatience | come back tomorrow | daily streak, limited events |
| 7. Unpredictability & curiosity | surprise | mystery badges, variable rewards |
| 8. Loss & avoidance | don't break the streak | streak-saver, decay |

**SDT (Deci & Ryan):** competence (mastery via leveling), autonomy (choice),
relatedness (classroom/group). **Flow (Csikszentmihalyi):** the ~80% challenge
target in the fluency engine IS flow-optimal by design.

Anti-pattern we reject: extrinsic-only PBL (points/badges/leaderboards with no
competence/autonomy/relatedness behind them). Every gamification element must
serve a drive, not just decorate.

## Pillar 4 — Classroom setting (MTSS/RTI)
Adaptive practice is a **tier-2 intervention**: it targets the kids who need it
most and self-levels. Immediate ASR feedback is the formative loop. Group/competition
features (drive 5) turn solo drill into a social classroom activity.

## Architecture (current)
- Next.js 15 (app router) + Supabase (Postgres + RLS + anon auth).
- Tables: `word_bank` (739 p1 words, 4-color segments), `students` (uid, username),
  `student_cards` (FSRS state), `review_events` (grade, elapsed, mode, used_audio).
- ASR: Azure Speech (key server-side via `/api/speech-token`, browser continuous
  STT + dictionary-constrained matching). Pronunciation Assessment available for scoring.

## Roadmap + status (2026-07-31)
| Feature | Pillar | Status |
|---|---|---|
| Adaptive word drill (fluency engine) | 1,2 | ✅ live |
| Always-on ASR auto-tick | 1,2 | ✅ live (matching hardening in progress) |
| p1 UX (fixed word, flip, roll, teacher bar) | 3 | ✅ live |
| Leaderboard (global, from review_events) | 3 (drive 5) | 🚧 building tonight |
| Gamification (XP/level/streak/badges) | 3 (drives 2,4,6,8) | 🚧 building tonight |
| Sentence reading → 0-3 (PA) | 1,2 | 🚧 building tonight |
| Classroom + groups + class competition | 3 (drive 5), 4 | ⏳ migration SQL tonight, apply later |
| WCPM metric | 1,2 | ⏸ parked (Tong) |
| Comprehension module (50 pts) | 1 | ⏳ scaffold tonight, build later |
| Repeated-reading passage cycles | 1,2 | 🔜 planned |

## Open questions for Tong
- Confirm the **0-3 sentence rubric** against the official RT PDF before trusting auto-scoring.
- Apply the **classroom migration SQL** (needs the mini) to activate groups/competition.
- **Deploy** (Vercel env vars) when ready to go live on arnork.com.
- Decide which Octalysis drives to emphasize first (recommendation: 2 + 5 + 6 —
  accomplishment, social, streak — they compound).
