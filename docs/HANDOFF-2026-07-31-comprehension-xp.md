# Handoff — comprehension/picture practice → XP, needs a DB migration (2026-07-31)

Built from the ThinkPad clone (has anon+service-role Supabase keys via `.env.local`,
does NOT have `SUPABASE_ACCESS_TOKEN`/`SUPABASE_DB_PASSWORD` — those are Mac-mini-only,
per `docs/PROJECT-STATE.md`). This is the one step that needed those creds.

## What changed
`/practice/comprehension` and `/practice/picture` scored locally only — never fed
the XP/leaderboard system. Wired them to `review_events` (`mode='comprehension'|'picture'`,
`word_id=null`, `item_id`=the item id / word). Leaderboard aggregation needs zero
changes: XP is already `grade`-only math, and `count(distinct word_id)` naturally
skips these null-word_id rows.

**Confirmed empirically (probe + cleanup, no residue left in prod):** `review_events.word_id`
is currently `NOT NULL` — inserting `word_id: null` throws
`null value in column "word_id" ... violates not-null constraint`. So the app
code will 500 on every comprehension/picture answer until the migration below runs.

## To apply
```
scripts/sql/comprehension_events.sql
```
via the Supabase Management API (same pattern as `phase1_practice_fluency.sql` /
`classrooms.sql` — `POST /v1/projects/{ref}/database/query`, needs `SUPABASE_ACCESS_TOKEN`
+ `SUPABASE_PROJECT_REF` from `~/.config/wordbank/env`). Two statements, both idempotent:
- `ALTER TABLE review_events ALTER COLUMN word_id DROP NOT NULL;`
- `ALTER TABLE review_events ADD COLUMN IF NOT EXISTS item_id text;`

## After applying
Quick check: play a round of `/practice/comprehension` or `/practice/picture` on
arnork.com, then confirm a `mode='comprehension'` (or `'picture'`) row landed in
`review_events` with `word_id=null`. Should also bump on `/leaderboard`.

## Not done (separate, bigger, out of scope for this pass)
- **Picture-retell** (10/50 RT pts, "answer about a picture") — the last
  uncovered comprehension subscore. Needs new image assets (same class of spend
  as the 12 word-picture flashcards, ~$0.13 gpt-image-1-mini) — no committed
  script for that generation step, so it's a manual/Tong-directed step, not
  something to run headless.
- **ครูกาญ review pass** on the 102 extracted RT items (`lib/comprehensionItems.ts`)
  before real student testing — OCR+agent-cleaned, cross-checked against each
  year's official answer key, but not yet human-reviewed.
