-- Phase 1: practice production mode + fluency engine (arnork.com)
-- Idempotent (IF NOT EXISTS / CREATE OR REPLACE). Run via the Supabase Management
-- API query endpoint (POST /v1/projects/{ref}/database/query) — the service-role
-- REST client cannot issue DDL.
--
-- Seed (scripts/seed_p1_words.mjs) runs AFTER this, so segments lands on real rows.

-- 1. word_bank.segments — curated {char,color}[] for p1 words.
--    null for RT words → they auto-color via utils/thaiColor classifyWord.
ALTER TABLE public.word_bank ADD COLUMN IF NOT EXISTS segments jsonb;

-- 2. review_events — production-mode capture (grade + elapsed already exist).
--    NOT NULL DEFAULT backfills existing (quiz) rows; those are on RT word_ids,
--    so they never join a p1 progress query — no cross-contamination.
ALTER TABLE public.review_events
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'production',
  ADD COLUMN IF NOT EXISTS used_audio boolean NOT NULL DEFAULT false;

-- 3. practice_progress() — per-p1-word fluency stats for the signed-in student.
--    Mirrors next_card(): SECURITY DEFINER + SET search_path + auth.uid() scope.
--    Returns the FULL p1 pool (so the client-side fluency engine pickNext can pick),
--    each row enriched with the student's recent accuracy (last 8 production grades),
--    average speed, and last review. Null recent_accuracy = unseen.
CREATE OR REPLACE FUNCTION public.practice_progress(p_limit integer DEFAULT 2000)
RETURNS TABLE(
  id bigint,
  text text,
  segments jsonb,
  reps integer,
  recent_accuracy real,
  avg_speed real,
  last_review timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  with wb as (
    select wb.id, wb.text, wb.segments
    from public.word_bank wb
    where wb.source = 'p1'
    order by wb.id
    limit p_limit
  ),
  sc as (
    select word_id, reps from public.student_cards where student_id = auth.uid()
  ),
  ev as (
    select word_id, grade, elapsed_sec, reviewed_at
    from (
      select e.word_id, e.grade, e.elapsed_sec, e.reviewed_at,
             row_number() over (partition by e.word_id order by e.reviewed_at desc) as rn
      from public.review_events e
      where e.student_id = auth.uid()
        and e.mode = 'production'
        and e.word_id in (select id from wb)
    ) x
    where rn <= 8
  ),
  ev_stat as (
    select word_id,
           count(*)::int as cnt,
           count(*) filter (where grade > 1)::int as correct,
           avg(elapsed_sec)::real as avg_speed,
           max(reviewed_at) as last_review
    from ev
    group by word_id
  )
  select
    wb.id,
    wb.text,
    wb.segments,
    coalesce(sc.reps, 0)::int as reps,
    case when ev_stat.cnt > 0 then (ev_stat.correct::real / ev_stat.cnt) else null end as recent_accuracy,
    ev_stat.avg_speed,
    ev_stat.last_review
  from wb
  left join sc on sc.word_id = wb.id
  left join ev_stat on ev_stat.word_id = wb.id;
$function$;

GRANT EXECUTE ON FUNCTION public.practice_progress(integer) TO authenticated, anon;
COMMENT ON FUNCTION public.practice_progress(integer) IS
  'Phase 1 fluency engine: per-p1-word stats (recent accuracy last-8, avg speed, last review) for the signed-in student. Client-side pickNext targets ~80% success.';
