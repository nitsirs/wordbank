import { supabase } from './supabaseClient';
import { ensureSession } from './db';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0/O, 1/I)

function randomCode(len = 5): string {
  let s = '';
  for (let i = 0; i < len; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

/** Teacher creates a class; returns its join code. Retries on code collision. */
export async function createClass(name: string): Promise<{ code: string }> {
  const uid = await ensureSession();
  for (let i = 0; i < 5; i++) {
    const code = randomCode();
    const { data, error } = await supabase
      .from('classrooms')
      .insert({ code, name, created_by: uid })
      .select('id, code')
      .single();
    if (!error && data) {
      await supabase
        .from('classroom_members')
        .insert({ classroom_id: data.id, student_id: uid, role: 'teacher' });
      return { code: data.code };
    }
    if (error && !/duplicate/i.test(error.message)) throw error;
  }
  throw new Error('สร้างรหัสห้องไม่ได้ ลองอีกครั้ง');
}

/** Student joins a class by code. Returns the class name, or null if code not found. */
export async function joinClass(code: string): Promise<{ name: string } | null> {
  const uid = await ensureSession();
  const { data: cls } = await supabase
    .from('classrooms')
    .select('id, name')
    .eq('code', code.toUpperCase())
    .maybeSingle();
  if (!cls) return null;
  const { error } = await supabase
    .from('classroom_members')
    .insert({ classroom_id: cls.id, student_id: uid, role: 'student' });
  if (error && !/duplicate/i.test(error.message)) throw error; // already a member is fine
  return { name: cls.name };
}

export interface ClassRow {
  username: string;
  reviews: number;
  correct: number;
  distinct_words: number;
  xp: number;
}

/** Class-scoped leaderboard via the SECURITY DEFINER RPC. */
export async function getClassLeaderboard(code: string): Promise<ClassRow[]> {
  const { data, error } = await supabase.rpc('class_leaderboard', { p_code: code.toUpperCase() });
  if (error) throw error;
  return (data ?? []) as ClassRow[];
}
