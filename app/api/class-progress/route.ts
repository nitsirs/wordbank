import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  teacherSupabase,
  isUnlocked,
  correctPin,
  TEACHER_COOKIE,
  TEACHER_COOKIE_MAX_AGE,
} from '@/lib/teacher-gate';

// Teacher PIN gate for the class_progress RPC. The RPC is revoked from
// anon/authenticated, so only this server route (service-role key, after PIN)
// can read student data.
export const dynamic = 'force-dynamic';

async function fetchRows() {
  const { data, error } = await teacherSupabase().rpc('class_progress');
  if (error) throw error;
  return data ?? [];
}

// GET: after unlock (cookie persists across reloads / the 30s auto-refresh).
export async function GET() {
  if (!(await isUnlocked())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    return NextResponse.json({ rows: await fetchRows() });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST: verify the PIN; on match set the httpOnly cookie and return rows.
export async function POST(req: NextRequest) {
  const pin = correctPin();
  if (!pin) {
    return NextResponse.json({ error: 'TEACHER_PIN not configured' }, { status: 500 });
  }
  let body: { pin?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* invalid/empty body -> treated as wrong pin below */
  }
  if (body.pin !== pin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const store = await cookies();
    store.set(TEACHER_COOKIE, pin, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: TEACHER_COOKIE_MAX_AGE,
    });
    return NextResponse.json({ rows: await fetchRows() });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
