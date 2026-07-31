import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Public read of the curated p1 word bank (text + 4-color segments) for the
// projector team game, which has no signed-in student. Falls back to [] so the
// game can use its local word set if the DB is unreachable.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ words: [] });
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await sb
    .from('word_bank')
    .select('text, segments')
    .eq('source', 'p1');
  if (error) return NextResponse.json({ words: [] });
  return NextResponse.json({ words: data ?? [] });
}
