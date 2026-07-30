import { supabase } from './supabaseClient';
import { FSRS, createEmptyCard, State, type Card, type Grade } from 'ts-fsrs';

// Grades (matches ts-fsrs Grade values)
export const GRADE = { Again: 1, Hard: 2, Good: 3, Easy: 4 } as const;

const fsrs = new FSRS({});

const STATE_NUM: Record<string, State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
};
const STATE_NAME: Record<number, 'new' | 'learning' | 'review' | 'relearning'> = {
  0: 'new',
  1: 'learning',
  2: 'review',
  3: 'relearning',
};

/** Ensure an anonymous Supabase session exists; returns the auth uid. */
export async function ensureSession(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) return session.user.id;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.user!.id;
}

/** Sign in / register a student by nickname. Adopts any legacy progress first. */
export async function signInStudent(username: string): Promise<void> {
  const uid = await ensureSession();
  await supabase.rpc('adopt_legacy', { p_username: username });
  await supabase.from('students').upsert(
    { id: uid, username, last_seen_at: new Date().toISOString() },
    { onConflict: 'id' }
  );
}

export interface NextCard {
  wordId: number;
  text: string;
  isNew: boolean;
  card: Card;
  againCount: number;
}

interface NextCardRow {
  word_id: number;
  text: string;
  is_new: boolean;
  due: string | null;
  stability: number | null;
  difficulty: number | null;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: 'new' | 'learning' | 'review' | 'relearning';
  last_review: string | null;
  again_count: number;
}

/** Fetch the next card to review (due first, else an unseen word). */
export async function fetchNextCard(): Promise<NextCard | null> {
  await ensureSession();
  const { data, error } = await supabase.rpc('next_card');
  if (error) throw error;
  const r = (data as NextCardRow[])?.[0];
  if (!r) return null;

  const card = createEmptyCard();
  card.due = r.due ? new Date(r.due) : new Date();
  card.stability = r.stability ?? 0;
  card.difficulty = r.difficulty ?? 0;
  card.elapsed_days = r.elapsed_days;
  card.scheduled_days = r.scheduled_days;
  card.reps = r.reps;
  card.lapses = r.lapses;
  card.state = STATE_NUM[r.state] ?? State.New;
  card.last_review = r.last_review ? new Date(r.last_review) : new Date();

  return { wordId: r.word_id, text: r.text, isNew: !!r.is_new, card, againCount: r.again_count };
}

/** Record a review: advance the FSRS card, upsert student_cards, append a review_event. */
export async function submitReview(
  wordId: number,
  grade: Grade,
  elapsedSec: number,
  card: Card,
  prevAgainCount: number
): Promise<{ card: Card; againCount: number }> {
  const uid = await ensureSession();
  const now = new Date();
  const next = fsrs.next(card, now, grade).card;
  const againCount = grade === GRADE.Again ? prevAgainCount + 1 : 0;

  const { error } = await supabase.from('student_cards').upsert(
    {
      student_id: uid,
      word_id: wordId,
      due: next.due,
      stability: next.stability,
      difficulty: next.difficulty,
      elapsed_days: next.elapsed_days,
      scheduled_days: next.scheduled_days,
      reps: next.reps,
      lapses: next.lapses,
      state: STATE_NAME[next.state],
      last_review: next.last_review ?? now,
      again_count: againCount,
    },
    { onConflict: 'student_id,word_id' }
  );
  if (error) throw error;

  await supabase.from('review_events').insert({
    student_id: uid,
    word_id: wordId,
    grade,
    elapsed_sec: elapsedSec,
  });

  return { card: next, againCount };
}

/** The signed-in student's daily review counts (for personal dashboards). */
export async function getMyDailyStats(days = 30) {
  const { data, error } = await supabase.rpc('my_daily_stats', { days_back: days });
  if (error) throw error;
  return (data ?? []) as { day: string; cards: number; seconds: number; correct: number }[];
}

// NOTE: class_progress RPC is now gated behind the /api/class-progress route
// (teacher PIN + service-role key). It is no longer called from the client.
