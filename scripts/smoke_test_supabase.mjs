// Smoke test: anon auth + RLS + card flow as real anon users (uses ANON key, not service role).
import { createClient } from '@supabase/supabase-js';
const URL_ = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const sb = () => createClient(URL_, ANON, { auth: { persistSession: false } });

const STATE = ['new','learning','review','relearning'];
function ok(c, m) { console.log(c ? '  ✓' : '  ✗', m); return c; }

const A = sb();
const { data: aAuth, error: aErr } = await A.auth.signInAnonymously();
if (aErr) { console.error('anon A failed:', aErr.message); process.exit(1); }
const uidA = aAuth.user.id;
console.log('anon A uid:', uidA);

// 1. upsert own student row (RLS: insert with check auth.uid()=id)
const { error: sErr } = await A.from('students').upsert({ id: uidA, username: 'smokeA' });
ok(!sErr, 'insert own students row ' + (sErr ? `(${sErr.message})` : ''));

// 2. next_card rpc (needs auth context)
const { data: card, error: nErr } = await A.rpc('next_card');
ok(!nErr && card?.length, `next_card returns a word: ${card?.[0]?.text ?? nErr?.message}`);

// 3. insert a review_event + student_card (own)
const wid = card?.[0]?.word_id;
const { error: evErr } = await A.from('review_events').insert({ student_id: uidA, word_id: wid, grade: 3, elapsed_sec: 2 });
ok(!evErr, 'insert review_event ' + (evErr ? `(${evErr.message})` : ''));
const { error: scErr } = await A.from('student_cards').upsert({ student_id: uidA, word_id: wid, reps: 1, state: 'review', difficulty: 5, stability: 1, due: new Date(Date.now()+86400000).toISOString(), last_review: new Date().toISOString() });
ok(!scErr, 'upsert student_card ' + (scErr ? `(${scErr.message})` : ''));

// 4. read own cards back (should see 1)
const { data: own } = await A.from('student_cards').select('*');
ok(own?.length === 1, `read own student_cards: ${own?.length} (expect 1)`);

// 5. RLS cross-user: anon B must NOT see A's cards
const B = sb();
await B.auth.signInAnonymously();
const { data: leak } = await B.from('student_cards').select('*');
ok(!leak?.length, `RLS blocks B from A's cards: B sees ${leak?.length} (expect 0)`);

// 6. word_bank readable by anon (public)
const { count } = await A.from('word_bank').select('*', { count: 'exact', head: true });
ok(count > 1000, `word_bank public read: ${count} words`);

console.log('\nSmoke test complete.');
