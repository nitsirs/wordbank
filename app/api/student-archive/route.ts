import { NextRequest, NextResponse } from 'next/server';
import { teacherSupabase, isUnlocked } from '@/lib/teacher-gate';

// Toggle a student's is_archived flag (hide/show on the teacher dashboard).
// Same PIN-cookie gate as class-progress.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!(await isUnlocked())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let body: { username?: string; archived?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    /* invalid body -> 400 below */
  }
  if (!body.username || typeof body.archived !== 'boolean') {
    return NextResponse.json({ error: 'username and archived (boolean) required' }, { status: 400 });
  }
  const { error } = await teacherSupabase()
    .from('students')
    .update({ is_archived: body.archived })
    .eq('username', body.username);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
