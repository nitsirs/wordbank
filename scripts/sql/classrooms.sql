-- Classroom + groups (Octalysis drive 5: social influence / classroom competition).
-- Idempotent. Applied via Supabase Mgmt API (POST .../database/query).
-- A teacher creates a class (gets a short join code); students join by code; the
-- class leaderboard aggregates review_events for members.

-- 1. classrooms
CREATE TABLE IF NOT EXISTS public.classrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "classrooms_read" ON public.classrooms;
CREATE POLICY "classrooms_read" ON public.classrooms FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "classrooms_insert" ON public.classrooms;
CREATE POLICY "classrooms_insert" ON public.classrooms FOR INSERT TO authenticated, anon WITH CHECK (true);
GRANT SELECT, INSERT ON public.classrooms TO authenticated, anon;

-- 2. classroom_members
CREATE TABLE IF NOT EXISTS public.classroom_members (
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE CASCADE,
  student_id uuid,
  role text NOT NULL DEFAULT 'student',
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (classroom_id, student_id)
);
ALTER TABLE public.classroom_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "members_self_insert" ON public.classroom_members;
CREATE POLICY "members_self_insert" ON public.classroom_members
  FOR INSERT TO authenticated, anon WITH CHECK (student_id = auth.uid());
DROP POLICY IF EXISTS "members_read" ON public.classroom_members;
CREATE POLICY "members_read" ON public.classroom_members
  FOR SELECT TO authenticated, anon USING (true);
GRANT SELECT, INSERT ON public.classroom_members TO authenticated, anon;

-- 3. class_leaderboard(code) — aggregate review_events for members of the class.
CREATE OR REPLACE FUNCTION public.class_leaderboard(p_code text)
RETURNS TABLE(username text, reviews bigint, correct bigint, distinct_words bigint, xp int)
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $function$
  select s.username,
         count(e.*)::bigint as reviews,
         count(*) filter (where e.grade > 1)::bigint as correct,
         count(distinct e.word_id)::bigint as distinct_words,
         (count(*) filter (where e.grade > 1) * 12
            + (count(*) - count(*) filter (where e.grade > 1)) * 3)::int as xp
  from public.classroom_members m
  join public.classrooms c on c.id = m.classroom_id
  join public.students s on s.id = m.student_id
  left join public.review_events e on e.student_id = m.student_id
  where c.code = p_code
  group by s.username
  order by xp desc;
$function$;
GRANT EXECUTE ON FUNCTION public.class_leaderboard(text) TO authenticated, anon;
