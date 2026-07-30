// One-time seed: the 739 hand-curated ป.1 color basics into word_bank.
//   node scripts/seed_p1_words.mjs
// Idempotent (upsert on (text,source); duplicate texts collapse via the unique
// index, ~41 dupes). After this, /practice/p1 reads colors from word_bank.segments,
// not the client wordData.ts (which stays as the seed source of record).
//
// Env (any of): SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY  — or the
// NEXT_PUBLIC_* variants from .env.local.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const wordDataPath = resolve(root, 'app/(app)/practice/p1/wordData.ts');

const URL_ = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_ variants).');
  process.exit(1);
}

// wordData.ts is `export const words = [ {char,color}[], ... ]` — plain JS literals.
let src = readFileSync(wordDataPath, 'utf8');
src = src.replace(/^export\s+const\s+words\s+=\s*/, '').replace(/;?\s*$/, '');
const words = eval('(' + src + ')');

if (!Array.isArray(words) || !words.every((w) => Array.isArray(w))) {
  throw new Error('wordData.ts did not parse to an array of segment arrays');
}

const rows = words.map((segs) => ({
  text: segs.map((c) => c.char).join(''),
  source: 'p1',
  segments: segs, // [{char,color}] — stored as jsonb; ColoredWord reads it back
}));

// Collapse duplicate texts client-side too (the DB unique index would otherwise
// raise on duplicates within one batch even with ignoreDuplicates on some drivers).
const dedup = [...new Map(rows.map((r) => [r.text, r])).values()];

const sb = createClient(URL_, KEY, { auth: { persistSession: false } });

const chunkSize = 250;
let inserted = 0;
for (let i = 0; i < dedup.length; i += chunkSize) {
  const chunk = dedup.slice(i, i + chunkSize);
  const { error } = await sb
    .from('word_bank')
    .upsert(chunk, { onConflict: 'text,source', ignoreDuplicates: true });
  if (error) {
    console.error(`chunk ${i} error:`, error.message);
    process.exit(1);
  }
  inserted += chunk.length;
}

const { count } = await sb
  .from('word_bank')
  .select('*', { count: 'exact', head: true })
  .eq('source', 'p1');

console.log(
  `p1 seed: ${words.length} entries → ${dedup.length} distinct texts → upserted; ` +
    `word_bank source='p1' now ${count} rows.`
);
