import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { xpFromStats, levelFromXp } from '@/lib/gamify';

export const dynamic = 'force-dynamic';

// Student-facing leaderboard (Octalysis drive 5: social influence). Service-role
// read across students (RLS blocks cross-student client reads). Returns only
// public aggregate stats (username + counts + xp + level). No PII, no keys.
// NOTE: open endpoint — consider rate-limiting before scale.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: 'db not configured' }, { status: 500 });
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  // bounded window so load stays cheap as the app grows
  const since = new Date(Date.now() - 90 * 86400000).toISOString();
  const [{ data: students }, { data: events }] = await Promise.all([
    sb.from('students').select('id, username'),
    sb.from('review_events').select('student_id, grade, word_id').gte('reviewed_at', since),
  ]);

  type Evt = { student_id: string; grade: number; word_id: number };
  type Agg = { reviews: number; correct: number; words: Set<number> };
  const agg = new Map<string, Agg>();
  for (const e of (events ?? []) as Evt[]) {
    const a = agg.get(e.student_id) ?? { reviews: 0, correct: 0, words: new Set<number>() };
    a.reviews++;
    if (e.grade > 1) a.correct++;
    a.words.add(e.word_id);
    agg.set(e.student_id, a);
  }

  const rows = ((students as { id: string; username: string }[] | null) ?? [])
    .map((stu) => {
      const a = agg.get(stu.id) ?? { reviews: 0, correct: 0, words: new Set<number>() };
      const xp = xpFromStats({ reviews: a.reviews, correct: a.correct });
      return {
        username: stu.username || 'นิรนาม',
        reviews: a.reviews,
        correct: a.correct,
        distinctWords: a.words.size,
        xp,
        level: levelFromXp(xp).level.lvl,
      };
    })
    .filter((r) => r.reviews > 0)
    .sort((a, b) => b.xp - a.xp || b.correct - a.correct)
    .slice(0, 50);

  return NextResponse.json({ rows });
}
