import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Teacher PIN gate for the class_progress RPC.
// The RPC itself is revoked from anon/authenticated (see migration), so the
// anon key in the client bundle can no longer read student data. Only this
// server route can call it, using the service-role key, and only after the
// teacher has supplied the correct PIN (stored in an httpOnly cookie).
export const dynamic = 'force-dynamic';

const COOKIE = 'tchr_unlock';
const MAX_AGE = 60 * 60 * 8; // 8 hours

function serverSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('missing Supabase server env');
  return createClient(url, key, { auth: { persistSession: false } });
}

async function fetchRows() {
  const { data, error } = await serverSupabase().rpc('class_progress');
  if (error) throw error;
  return data ?? [];
}

async function isUnlocked(): Promise<boolean> {
  const pin = process.env.TEACHER_PIN;
  if (!pin) return false;
  const store = await cookies();
  return store.get(COOKIE)?.value === pin;
}

// GET: used by the dashboard after unlock (cookie persists across reloads /
// the 30s auto-refresh). 401 if no valid cookie.
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
  const pin = process.env.TEACHER_PIN;
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
    store.set(COOKIE, pin, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: MAX_AGE });
    return NextResponse.json({ rows: await fetchRows() });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
