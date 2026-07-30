---
name: gamification-design
description: Design and critique gamification for the ป.1 reading app using Yu-kai Chou's Octalysis framework. Use when designing leaderboards, rewards, streaks, competition, classroom group features, or any engagement mechanic — keeps young-learner (6-7yo) motivation healthy and aligned to the RT KPI.
updated: 2026-07-30
source: Yu-kai Chou, Actionable Gamification (CreateSpace/Leanpub, 2015). Page cites throughout. See sourcing footer for what this edition does NOT cover.
---

# Gamification Design — Octalysis lens for the ป.1 reading app

Grounded in Yu-kai Chou, *Actionable Gamification* (2015). Page numbers cited inline.

## Why this exists

Gamification here has one job: increase **productive reading practice** (read-aloud reps, comprehension attempts) that raises the [RT score](../../../docs/RT-BENCHMARK.md). Gamification does not teach reading. The true KPI proxy is **retention / re-engagement** — sustained voluntary practice is what builds the fluency + comprehension RT measures. Measure Endgame retention (% of kids still choosing to read at week 8+) as the leading indicator.

**Standing stance (Tong): intrinsic-first.** Points, leaderboards, real-life rewards are the smallest possible support layer, never the engine. The #1 risk for 6-7yo is the **overjustification effect** — sticker a child for reading and you risk reframing "I am a reader" into "I read for stickers," and motivation collapses when the stickers stop (Chou p20; daycare study below).

## The app context

- ป.1 readers, ~6-7yo, Thai school (โรงเรียนวัดโสมนัส).
- Settings: **individual 1:1** (teacher/parent + child) and **classroom group** (possible competition/leaderboard/real-life rewards); **home/parent** mode likely.

## The 8 Core Drives — definition, the book's real techniques, and the app move

| CD | Drive | Left/Right · Hat | Named techniques *in this book* (page) | App feature idea | Risk for 6-7yo |
|---|---|---|---|---|---|
| 1 | **Epic Meaning & Calling** | Right · White | Narrative #10 (p52), Humanity Hero #27 (p53), Elitism #26 (p54), Beginner's Luck #23 (p57), Free Lunch #24 (p58). *Believability is make-or-break (p58).* | Mission frame: "นักอ่านน้อยผู้กอบกู้เรื่องราว" — each book read recovers a piece of a lost class story (Zamzee did this for exercise → +59% activity, p53). | Low. Only failure mode is feeling like marketing. |
| 2 | **Development & Accomplishment** | Right·L · White | "Easiest drive to design for" (p16). *A badge without a challenge is meaningless (p16).* | Skill-tree of phonics/word-type milestones that unlocks on **demonstrated mastery**, not time served. | Medium — this is where PBL creeps in. |
| 3 | **Empowerment of Creativity & Feedback** | Right · White | **Evergreen Mechanics (p16)** — the brain entertains itself. *The games with the longest Endgame hold CD3 longest (p104).* | **PRIORITY.** Kids create with decoded words: build mini-stories (หนังสือเล่มเล็ก), record their own read-aloud, draw responses, see/hear it back. | Lowest risk, highest long-term payoff. |
| 4 | **Ownership & Possession** | Left · mid | Drives the Endowment Effect (p156). | Personal bookshelf + avatar customized by reading. Keep non-transactional (no "pay stars to unlock"). | Medium — currency slides extrinsic fast. |
| 5 | **Social Influence & Relatedness** | Right · mid | Social Treasure (p89), Tout Flags #64 (p57). *Competition & collaboration are the SAME drive (p17).* | Classroom **reading teams** (collaborative); peer "I liked your reading" voice-notes; 1:1 teacher affirmation is the core loop. | Medium — envy/competition is risky at 6. |
| 6 | **Scarcity & Impatience** | Left · Black | Dangling #44 (p79), Anchored Juxtaposition #69 (p79), Magnetic Caps #68 (p82), Appointment Dynamics #21 (p85), Torture Breaks #66 (p87), Evolved UI #37 (p91). | ONLY a gentle "new chapter unlocks tomorrow" appointment (p85) as a daily-return trigger. | **HIGH.** Never Torture Breaks/Dangling/Anchored Juxtaposition on kids (those are Candy-Crush monetization, p88). Artificial scarcity of *learning content* is unethical here. |
| 7 | **Unpredictability & Curiosity** | Right · Black | *The Skinner Box is exclusively CD7 (p18).* | Surprise endings, mystery word of the day, weekly mystery book. Chou notes randomness also makes tasks easier for novices (p141). | Low. Avoid gambling-like variable rewards. |
| 8 | **Loss & Avoidance** | Left · Black | **Sunk Cost Prison (p99)**; can flip into an Anti-Core Drive / self-denial (p80). | **Recommendation: do not deploy.** At most, forgiving streaks (freeze passes, never shame a broken streak). | **HIGHEST.** Streak-loss anxiety, public demotion, "you'll fall behind" are developmentally inappropriate. |

## Two axes + Chou's blend rule

- **Right Brain (intrinsic) = 1, 3, 5, 7** · **Left Brain (extrinsic) = 2, 4, 6, 8** (p19; labels are symbolic, not literal brain geography).
- **White Hat (feel good, no urgency) = 1, 2, 3** · **Black Hat (urgency/obsession) = 6, 7, 8** · **mid-line = 4, 5** (pp21-23).
- **White Hat's weakness:** no urgency — "Go change the world!" → "Great, after breakfast" (p101). **Black Hat's weakness:** burnout/revolt (Zynga juiced metrics but users quit because they didn't feel good, pp102-104).
- **The blend rule (p115-119):** establish White Hat → apply Black Hat at the *conversion moment* → immediately return to White Hat so the user feels good again. Pure White Hat = always intending, never doing; pure Black Hat = churn.

## The PBL fallacy + the daycare study (the warning that matters most)

Pure Points/Badges/Leaderboards is the "shell" of a game and mostly triggers only CD2 (Ch2, pp3-12; p16). The canonical demonstration of why extrinsic rewards backfire: the **Israeli daycare study (pp116-117)** — adding a $3 late-pickup fine *increased* lateness, because it reframed a moral/intrinsic duty as a cheap transaction; lateness stayed high even after the fine was removed. **This is exactly the mechanism when you sticker/star a child for reading.**

Rules for using PBL well: not *whether*, but **how, when, why** (p10). Badges are acceptable as a CD2 feedback signal **only tied to a genuine challenge** (p16). Design Right-Brain/White-Hat drives first; PBL is a secondary layer, never the motivation itself (p20). **Best rewards are "Boosters"** — things that send the user back to read more effectively — not cash/badges (p81).

## The 4 experience phases — Endgame is the load-bearing one

- **Discovery** (why try?) — CD7 curiosity + CD1 Epic Meaning, best communicated here (pp31, 41).
- **Onboarding** (can I do this?) — CD2, feel competent fast; **Evolved UI** (start 2-3 options, unlock more) to avoid Decision Paralysis (pp91-93). First read-aloud success within 60 seconds.
- **Scaffolding** (the habit loop) — CD5 + CD6; daily "เช้านี้มีนัดอ่าน" cue + FSRS schedule.
- **Endgame** (mastered — why stay?) — **where classroom tools die.** Chou built the whole White/Black-Hat theory studying why games die here (p98). The timeless ones (Chess, Poker, Mahjong, WoW) sustain **CD3** deep into Endgame (p100). **Plan CD3 (creativity) for mastered readers or they churn: become a reading buddy to younger kids (CD1+CD5), author books (CD3), unlock harder RT word-types.**

## Player types (use loosely — Bartle himself cautioned his 4 don't generalize outside games, p135)

Bartle's 4: Achievers (CD2+6) · Explorers (CD7) · Socializers (CD5) · Killers (CD2+5). Marczewski's 6 workplace types fit non-game contexts better: **Players = extrinsic (CD4), Free Spirits = intrinsic creators (CD3/7), Philanthropists = help others (CD1).** Different types enter/drop at different phases (p137).

## Design recipe — answer for any proposed feature

1. Which Core Drive(s) does it primarily hit?
2. Intrinsic/extrinsic? White/Black? — flag any Black-Hat-heavy design.
3. **Overjustification check:** does this reward reframe reading as a transaction? (daycare study)
4. Age-appropriate for 6-7yo? (stress, shame, zero-sum, streak-anxiety)
5. Does it increase *productive* practice (read-aloud reps / comprehension), or just time-on-app?
6. Phase: Discovery / Onboarding / Scaffolding / Endgame?
7. RT alignment: does more of this predict higher RT?

Spawn the **yu-kai-chou** agent to red-team any non-trivial design before it ships.

## App guardrails (firm rules)

- **Leaderboards:** team/class-level CD5 only, **never** individual public ranking (shames the slowest reader → CD8 Anti-Core Drive → exit, p80).
- **Real-life rewards:** use sparingly, unpredictably, never as quid-pro-quo for reading. Prefer Boosters.
- **CD8 (loss/streaks):** don't deploy; if streaks exist, make them forgiving and never shame breaks.
- **CD6 (scarcity):** only gentle appointment dynamics; never withhold learning content.
- **CD3 (creativity):** prioritize — it's the Endgame insurance and the healthiest long-term engagement.
- **CD1 (meaning):** must feel authentic to a 7-year-old or it backfires (p58).

## Ethics litmus (p108)
Full transparency on purpose + user opt-in. Beware "100% lift" claims — usually 8%→16%, and 84% opt out (p109).

## Sourcing footer + caveats
Source: Yu-kai Chou, *Actionable Gamification*, CreateSpace/Leanpub 2015, 163pp. **This edition is partial:** only CD1 (Ch5) and CD6 (Ch10) are deep-dived; the other six drives get paragraph-level treatment (Ch3); the deep chapter on overjustification (Ch13) is deferred and ABSENT. "Schedules of Reinforcement," "Milestone Unlocks," and the full "#" technique catalogue for all drives belong to Chou's *later* expanded Octalysis work — do not attribute them to this book. Child-development pedagogy (decoding stages, phonemic awareness) and RT design are NOT in Chou; source from reading-science literature (e.g. National Reading Panel) before adding. "Blissful Productivity" is Jane McGonigal's term Chou cites (p153), not his.
