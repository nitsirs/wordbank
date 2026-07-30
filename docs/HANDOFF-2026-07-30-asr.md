# Handoff — ASR read-aloud (next up), 2026-07-30

> **Read this first if you're picking up the arnork/wordbank work in a fresh terminal.**
> Self-contained — no prior conversation needed. Repo: `~/Desktop/kru-kan/wordbank`.

## TL;DR
- **Phase 1 (fluency engine) is SHIPPED + LIVE.** `/practice/p1` went from a browse wall to an adaptive production drill. Vercel `main` deploy `80540cb` is READY; arnork.com/practice/p1 returns 200.
- **Next build = ASR read-aloud** (the 50-pt oral-reading half of the RT test). It is currently **blocked on a working Azure Speech key**.
- **Azure MCP was just connected** (`@azure/mcp`, user scope) to fetch that key cleanly — but its tools need a **session restart + one-time Azure login**, so they were NOT usable in the session that wrote this.

## What Phase 1 delivered (done, verified)
- `lib/fluency.ts` (new) — `fluencyScore` (accuracy+speed+recency, keybr model) + `pickNext` (Gaussian peaked at 0.8 target, gentle below to rescue weak words, sharp above to retire mastered, +15% unseen-introduction drip). All knobs in one `FLUENCY` const. Verified: 4000-pick sim → 15.8% unseen, seen picks peak 0.7–0.9.
- `services/db.ts` (edit) — `fetchPracticeProgress()` (calls `practice_progress` RPC) + `submitPracticeReview()` (FSRS advanced as a side input, not the driver; writes `review_events` with `mode`/`used_audio`).
- `app/(app)/practice/p1/page.tsx` (rewrite) — mask-faded scroll-snap drum (kid view) + rotated adult copy + tap-to-hear + ✔/✖. Loads pool once, picks next client-side w/ optimistic stat updates.
- `app/(app)/practice/p1/p1.module.css` (rewrite) — drum styles.
- `scripts/seed_p1_words.mjs` (new) — seeded 739 curated words → **698 rows** (41 dupes collapsed), all with 4-color `segments`.
- `scripts/sql/phase1_practice_fluency.sql` (new) — the migration (idempotent; applied).
- DB migration (APPLIED via Supabase Mgmt API): `word_bank.segments` jsonb; `review_events.mode`/`used_audio`; `practice_progress(integer)` RPC (SECURITY DEFINER + `auth.uid()`, mirrors `next_card`). E2E smoke-verified: fresh student → 698 unseen rows → after one production review, RPC reflects `recent_accuracy/avg_speed/last_review/reps`, `review_events` stored `mode`+`used_audio`. Test rows cleaned up.

## The RT rubric (the strategic anchor)
From `~/Downloads/โครงสร้างการอ่าน RT ป.1 ปี68.pdf` (official ป.1 reading test, 2568). **RT = 100:**
- **การอ่านออกเสียง (oral read-aloud) = 50**: **20 pts** single words (20 words × 1, scored 0/1) + **30 pts** one 10-sentence text (×3, scored 0–3).
- **การอ่านรู้เรื่อง (comprehension) = 50**: 10 word-meaning + 10 picture-retell + 20 sentence-comp + 10 text-comp.
- The test's **word domain** — tone marks, codas (ตัวสะกด ตรง/ไม่ตรงมาตรา), clusters (คบกล้า), อักษรนำ, การันต์ — **is ครูกาญ's 4-color decomposition verbatim**. So the fluency engine + the 739-word set are aimed exactly at the **20-pt single-word** target. That is the cleanest first ASR wedge.

## The ASR plan (resume here once the key is live)
1. **Probe th-TH Pronunciation Assessment** — confirm it returns scored output (AccuracyScore / CompletenessScore / FluencyScore per word). This is the design fork: **PA-scored = small build** (we map its score → 0/1); **STT-only = bigger build** (Thai STT + our own WCPM/accuracy scorer). Tong believes PA supports Thai; verify for real with a live key.
2. **ASR word-reading** — record a word → score → 0/1 → into the fluency engine. This is the 20-pt wedge AND removes the adult-in-the-loop (✔/✖) for solo practice.
3. **Sentence level** (the 30 pts; sentence-level PA fluency/completeness → 0–3).
4. **Comprehension module** (the other 50 pts; not ASR).

## BLOCKER: the Azure Speech key is dead
- The key in `services/azureSpeechService.ts` (region `eastus`, **hardcoded + committed**) produces **0-byte audio** (SDK synth) and **401** (REST). It's been rotated/disabled — matches Tong's open token-rotation backlog.
- Consequence: TTS pipeline dead too (existing `/audio/trimmed/*.mp3` still play; new words can't get audio).
- **Fix path:** the Azure MCP (now connected) should, after login, find the Speech resource Tong created and fetch a working key. Write it to `~/.config/wordbank/env` (mini) **and** `~/Desktop/kru-kan/wordbank/.env.local` — **never echo the value, never commit it**. When wiring it into the app, move it OUT of `azureSpeechService.ts` into env (it's currently hardcoded in source).
- Probe code pattern that worked for the synth half (recognizer needs Node push-stream, not `fromWavFileInput` which loads the browser bundle): see the deleted `_probe_pa.mjs` — TTS via SDK works; recognize via `sdk.AudioInputStream.createPushStream()` (strip 44-byte RIFF header) + `PronunciationAssessmentConfig`. Or use the Speech REST PA endpoint (needs valid key; earlier 401 was the dead key, not the endpoint).

## Azure MCP status (just connected this session)
- Registered **user scope**: `claude mcp add azure -s user -- npx -y @azure/mcp@latest server start` → `~/.claude.json`. `claude mcp list` shows **✔ Connected**.
- Package `@azure/mcp` v3.0.0-beta.30 (binary `azmcp`).
- **Tools are NOT in the session that wrote this** — MCP loads at session start. So: **restart Claude**, then the `mcp__azure_*` tools appear; first call triggers a one-time browser/device-code Azure login.
- It is **management-plane** (find resource, fetch/regenerate key, deploy) — it does NOT do pronunciation scoring. Use it to get the key into env; score via the Speech API.
- Open: confirm the MCP can fetch a Speech/Cognitive-Services key directly, or whether `az` CLI is needed (the MCP's `extension` tool can install `az`). No `az` CLI on the ThinkPad today.

## Infra access (fresh-session notes)
- **Supabase creds**: Mac mini `~/.config/wordbank/env` (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_PROJECT_REF=vmltwkemcwdjblxgjrnb`, `SUPABASE_DB_PASSWORD`, `VERCEL_TOKEN`, `ARNORK_CLOUDFLARE_API_TOKEN`). SSH: `ssh nitsirs@100.122.205.30`.
- **Run SQL** via Supabase Mgmt API: `POST https://api.supabase.com/v1/projects/{ref}/database/query` body `{"query":"..."}`, Bearer = access token. ⚠️ **must send a `User-Agent` header** (else CF 403/1010). Non-interactive SSH has **no node/jq** — use **python3** to JSON-encode the body.
- **Local build** (ThinkPad): `.env.local` (gitignored) has `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `TEACHER_PIN=251400`. `npm run build` must stay green before merge.
- **Vercel**: project `prj_BCY73xgNsQm0nTynV9Ox5QyU0UkE`, token on mini as `VERCEL_TOKEN`. Keep Next.js on latest patched 15.x (Vercel blocks vulnerable versions; a local-green build ≠ Vercel-green).
- Git: wordbank on `main`, HTTPS remote `github.com/nitsirs/wordbank.git`. No auto-commit hook here (that's PoomJAI only). Commit + push manually. This is a Tong side-project, not Lead+D/PoomJAI — **no PoomJAI files change for this work**.

## Flags / cleanup still open
- `docs/PROJECT-STATE.md` is **stale** — still describes `/practice/p1` as the old browse wall, predates the fluency engine. Worth a refresh.
- Hardcoded dead Azure key in `services/azureSpeechService.ts` → move new key to env when replaced.
- Tong's deferred token rotation (6 chat-exposed tokens incl. Supabase/Vercel/CF) still open.
- `wordData.ts`/`spellingData.ts` are now seed-source only (page reads from `word_bank`); deprecate later.

## Paste-prompt for the new terminal (first message)
```
Read ~/Desktop/kru-kan/wordbank/docs/HANDOFF-2026-07-30-asr.md first.
Then: the Azure MCP should now be loaded (mcp__azure_*). Use it to log in to Azure,
find the Speech resource, and fetch a working key into ~/.config/wordbank/env and
~/Desktop/kru-kan/wordbank/.env.local (do NOT echo or commit the value). Then probe
th-TH Pronunciation Assessment and tell me whether it returns scored output
(AccuracyScore etc.) — that decides the ASR build shape.
```
