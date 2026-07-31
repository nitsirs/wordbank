-- Feed comprehension + picture-match practice into the same XP/leaderboard
-- progression as word review (Octalysis: no silo — see docs/COMPREHENSION-DESIGN.md
-- "Scoring + gamification"). Idempotent. Applied via Supabase Management API
-- (POST /v1/projects/{ref}/database/query) — the service-role REST client
-- cannot issue DDL.
--
-- review_events already carries grade + mode (see phase1_practice_fluency.sql).
-- word_id is NOT NULL today (confirmed empirically 2026-07-31: inserting
-- word_id=null throws "violates not-null constraint"). Comprehension/picture
-- items aren't word_bank rows, so word_id must go nullable; item_id carries
-- the comprehension item id (e.g. "61-10") or picture word (e.g. "มะม่วง").

ALTER TABLE public.review_events
  ALTER COLUMN word_id DROP NOT NULL;

ALTER TABLE public.review_events
  ADD COLUMN IF NOT EXISTS item_id text;

-- No other RPC/aggregation changes needed: leaderboard + class_leaderboard
-- already compute xp = correct*12 + wrong*3 from grade alone (mode-agnostic),
-- and count(distinct word_id) naturally excludes these null-word_id rows from
-- "distinct words" — correct, since a comprehension item isn't a word.
