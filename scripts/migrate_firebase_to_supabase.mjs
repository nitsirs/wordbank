// One-time migration: Firebase RTDB -> Supabase. Run with the SERVICE ROLE key.
//   node scripts/migrate_firebase_to_supabase.mjs --words     seed word_bank (RT 1600)
//   node scripts/migrate_firebase_to_supabase.mjs --students   port reviewed cards (180 students)
// Idempotent (upserts). --students also runs --words if word_bank is empty.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Deterministic uuid per username => --students is idempotent (safe to re-run at cutover).
const detUuid = (name) => {
  const h = createHash('md5').update('arnork:' + name).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
};

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FB = process.env.FIREBASE_URL || 'https://wordbank2-4ba34-default-rtdb.asia-southeast1.firebasedatabase.app';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const wordList = JSON.parse(readFileSync(resolve(root, 'app/wordList.json'), 'utf8'));

if (!URL_ || !KEY) { console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const sb = createClient(URL_, KEY, { auth: { persistSession: false } });

const STATE = ['new', 'learning', 'review', 'relearning']; // ts-fsrs State 0..3
const chunkSize = 500;
const chunk = (a) => { const out = []; for (let i = 0; i < a.length; i += chunkSize) out.push(a.slice(i, i + chunkSize)); return out; };

async function seedWords() {
  const rows = wordList.map((text) => ({ text, source: 'rt', rt_tag: 'none' }));
  let n = 0;
  for (const c of chunk(rows)) {
    const { error } = await sb.from('word_bank').upsert(c, { onConflict: 'text,source', ignoreDuplicates: true });
    if (error) console.error('word_bank chunk error:', error.message);
    n += c.length;
  }
  const { count } = await sb.from('word_bank').select('*', { count: 'exact', head: true });
  console.log(`seeded RT words (inserted up to ${n}, word_bank total now ${count})`);
}

async function portStudents() {
  const { count } = await sb.from('word_bank').select('*', { count: 'exact', head: true });
  if (!count) { console.log('word_bank empty — seeding words first'); await seedWords(); }

  const { data: wb } = await sb.from('word_bank').select('id,text').eq('source', 'rt');
  const textToId = new Map(wb.map((w) => [w.text, w.id]));

  const users = await (await fetch(`${FB}/users.json`)).json();
  let students = 0, cards = 0, skipped = 0;
  for (const [username, u] of Object.entries(users || {})) {
    const entries = Object.entries(u?.words || {}).filter(([, v]) => v?.card?.reps > 0);
    if (!entries.length) { skipped++; continue; }
    const sid = detUuid(username);
    const { error: se } = await sb.from('students').upsert({ id: sid, username, legacy_username: username });
    if (se) { console.error(`student ${username}:`, se.message); continue; }
    students++;
    const _rows = entries.map(([k, v]) => {
      const idx = parseInt(k.replace('wordId', '')) - 1;
      const wid = textToId.get(wordList[idx]);
      if (!wid) return null;
      const c = v.card;
      return {
        student_id: sid, word_id: wid,
        due: c.due ?? null, stability: c.stability ?? null, difficulty: c.difficulty ?? null,
        elapsed_days: c.elapsed_days ?? 0, scheduled_days: c.scheduled_days ?? 0,
        reps: c.reps ?? 0, lapses: c.lapses ?? 0, state: STATE[c.state] ?? 'new',
        last_review: c.last_review ?? null, again_count: v.againCount ?? 0,
      };
    }).filter(Boolean);
    // dedupe by word_id (wordList has ~40 duplicate texts -> same word_bank id)
    const rows = [...new Map(_rows.map((r) => [r.word_id, r])).values()];
    for (const c of chunk(rows)) {
      const { error } = await sb.from('student_cards').upsert(c, { onConflict: 'student_id,word_id' });
      if (error) console.error(`cards ${username}:`, error.message);
    }
    cards += rows.length;
  }
  console.log(`ported ${students} students (+${skipped} with no reviews), ${cards} reviewed cards`);
}

const phase = process.argv[2];
if (phase === '--words') await seedWords();
else if (phase === '--students') await portStudents();
else console.log('usage: node scripts/migrate_firebase_to_supabase.mjs --words | --students');
