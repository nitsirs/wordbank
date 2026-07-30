import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Shared teacher-gate for the two gated API routes (class-progress + student-archive).
// A teacher unlocks by POSTing the PIN; the server sets an httpOnly cookie that
// the GET path (and the archive route) accept for the next 8 hours.

export const TEACHER_COOKIE = 'tchr_unlock';
export const TEACHER_COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

/** The configured teacher PIN (server env), or undefined. */
export function correctPin(): string | undefined {
  return process.env.TEACHER_PIN;
}

/** Server-only Supabase client using the service-role key. Never expose to client. */
export function teacherSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('missing Supabase server env');
  return createClient(url, key, { auth: { persistSession: false } });
}

/** True if the current request carries a valid teacher-unlock cookie. */
export async function isUnlocked(): Promise<boolean> {
  const pin = correctPin();
  if (!pin) return false;
  const store = await cookies();
  return store.get(TEACHER_COOKIE)?.value === pin;
}
