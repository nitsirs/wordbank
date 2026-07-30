'use client';

import { useState, useEffect, useRef } from 'react';
import { Volume2 } from 'lucide-react';
import { ColoredWord } from '@/components/ColoredWord';
import audioQueue from '@/services/audioService';
import { fetchPracticeProgress, submitPracticeReview, GRADE } from '@/services/db';
import { pickNext, type FluencyWord, type FluencyStats } from '@/lib/fluency';
import styles from './p1.module.css';

/**
 * บัญชีคำ ป.1 — อ่านออกเสียง (production mode).
 *
 * Layout (2026-07-30 redesign):
 * - Kid zone: the current word is FIXED + centered (no scroll drum that hides it),
 *   with the next word faded below as a "ต่อไป" peek so the kid can read ahead fast.
 * - Parent/teacher bar: a compact horizontal slide of the upcoming queue, pinned to
 *   the bottom, current word bolded.
 *
 * The client-side fluency engine (lib/fluency.ts) picks each next word to land near
 * the ~80% success zone, weighted toward the weak band with a steady drip of new
 * words. Colors from word_bank.segments (ครูกาญ 4-color). FSRS runs only as a
 * maintenance side input (services/db.ts submitPracticeReview).
 */
export default function P1PracticePage() {
  const [words, setWords] = useState<FluencyWord[]>([]);
  const [seen, setSeen] = useState(0); // words completed
  const [current, setCurrent] = useState<FluencyWord | null>(null);
  const [queue, setQueue] = useState<FluencyWord[]>([]); // upcoming preview (excl. current)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [usedAudio, setUsedAudio] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const busyRef = useRef(false);

  // Best-effort preview of the next N words (excluding excludeId), for the
  // kid's "ต่อไป" peek and the teacher's upcoming-queue strip. Real next pick
  // still depends on each grade; this is a planning preview only.
  const buildQueue = (pool: FluencyWord[], excludeId: number | null, n: number): FluencyWord[] => {
    const out: FluencyWord[] = [];
    const excl = new Set<number>(excludeId != null ? [excludeId] : []);
    for (let i = 0; i < n; i++) {
      const w = pickNext(pool.filter((x) => !excl.has(x.id)));
      if (!w) break;
      out.push(w);
      excl.add(w.id);
    }
    return out;
  };

  // load the p1 pool once, pick the first word + initial queue
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof window !== 'undefined' && !localStorage.getItem('username')) {
        window.location.href = '/';
        return;
      }
      try {
        const pool = await fetchPracticeProgress();
        if (cancelled) return;
        setWords(pool);
        const first = pickNext(pool);
        if (first) {
          setCurrent(first);
          setQueue(buildQueue(pool, first.id, 6));
          startTimeRef.current = Date.now();
          audioQueue.preload(first.text).catch(() => {});
        }
      } catch (e) {
        console.error('practice load failed:', e);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const next = queue[0] ?? null; // kid "ต่อไป" peek

  const playAudio = async () => {
    if (!current) return;
    setUsedAudio(true);
    try {
      await audioQueue.play(current.text);
    } catch (e) {
      console.error('audio error:', e);
    }
  };

  const handleReview = (correct: boolean) => {
    if (busyRef.current || !current) return;
    busyRef.current = true;

    const now = Date.now();
    const elapsed = (now - (startTimeRef.current ?? now)) / 1000;
    const grade = correct ? GRADE.Good : GRADE.Again;

    // optimistic: nudge this word's stats in the pool, then pick next from the
    // updated pool so the selector immediately reflects the grade we just gave.
    const updated = words.map((w) => {
      if (w.id !== current.id) return w;
      const prevAcc = w.stats.recentAccuracy ?? 0.5;
      const prevSpeed = w.stats.avgSpeed ?? elapsed;
      const nextStats: FluencyStats = {
        reps: w.stats.reps + 1,
        recentAccuracy: prevAcc * 0.6 + (correct ? 1 : 0) * 0.4,
        avgSpeed: prevSpeed * 0.6 + elapsed * 0.4,
        lastReviewMs: now,
      };
      return { ...w, stats: nextStats };
    });
    setWords(updated);

    // fire-and-forget the DB write (FSRS side input + production review_event)
    submitPracticeReview(current.id, grade, elapsed, usedAudio).catch((e) =>
      console.error('submit failed:', e),
    );

    // advance to the next word; rebuild the preview queue
    const upcoming = pickNext(updated, { excludeId: current.id });
    if (upcoming) {
      setCurrent(upcoming);
      setQueue(buildQueue(updated, upcoming.id, 6));
      setUsedAudio(false);
      startTimeRef.current = Date.now();
      audioQueue.preload(upcoming.text).catch(() => {});
    }
    setSeen((s) => s + 1);
    window.setTimeout(() => {
      busyRef.current = false;
    }, 350);
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-gray-500 text-lg">
        กำลังโหลด…
      </main>
    );
  }

  if (error || !words.length) {
    return (
      <main className="min-h-screen flex items-center justify-center text-gray-500 text-lg">
        ยังไม่มีคำในระบบ
      </main>
    );
  }

  return (
    <main className="relative h-[100dvh] overflow-hidden bg-[#F5F6F8] flex flex-col">
      {/* compact title */}
      <header className="text-center pt-3 pb-1 shrink-0">
        <h1 className="text-sm font-semibold text-[#35389D]">บัญชีคำ ป.1 — อ่านออกเสียง</h1>
      </header>

      {/* KID zone — current word FIXED + centered, flipped 180° for the kid across
          the table; rolls in smoothly on each advance. Next word faded peek. */}
      <section className="flex-1 min-h-0 flex items-center justify-center px-4 overflow-hidden">
        {current && (
          <div className="rotate-180 flex flex-col items-center select-none">
            <h2 key={current.id} className={`text-7xl font-bold text-center leading-tight ${styles.roll}`}>
              <ColoredWord segments={current.segments ?? undefined} text={current.text} />
            </h2>
            {next && (
              <div className="mt-8 flex flex-col items-center opacity-25">
                <span className="text-2xl font-semibold text-gray-600">
                  <ColoredWord segments={next.segments ?? undefined} text={next.text} />
                </span>
                <span className="text-[11px] tracking-widest text-gray-400 mt-1">ต่อไป</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* controls */}
      <div className="flex flex-col items-center gap-3 w-full max-w-md mx-auto px-4 pb-3 shrink-0">
        <button
          onClick={playAudio}
          disabled={!current}
          className={`flex items-center gap-2 px-5 py-2 rounded-full text-white text-sm font-medium transition-colors ${
            usedAudio ? 'bg-[#35389D]' : 'bg-gray-400 hover:bg-gray-500'
          } disabled:opacity-50`}
        >
          <Volume2 className="w-4 h-4" />
          ฟังเสียง
        </button>

        <div className="flex gap-4 w-full">
          <button
            onClick={() => handleReview(false)}
            disabled={!current}
            className="bg-red-500 text-white py-4 rounded-2xl text-3xl w-1/2 hover:bg-red-600 disabled:opacity-50"
            aria-label="อ่านไม่ได้"
          >
            ✖
          </button>
          <button
            onClick={() => handleReview(true)}
            disabled={!current}
            className="bg-green-500 text-white py-4 rounded-2xl text-3xl w-1/2 hover:bg-green-600 disabled:opacity-50"
            aria-label="อ่านได้"
          >
            ✔
          </button>
        </div>

        <p className="text-gray-400 text-xs">อ่านแล้ว {seen} คำ</p>
      </div>

      {/* PARENT/TEACHER bar — pinned bottom, compact horizontal slide of the queue */}
      <footer className="border-t border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-3 overflow-x-auto px-3 py-2 text-sm whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {current && (
            <span className="font-bold text-[#35389D] underline underline-offset-2">
              {current.text}
            </span>
          )}
          <span className="text-gray-300">›</span>
          {queue.map((w, i) => (
            <span key={`${w.id}-${i}`} className="text-gray-400">
              {w.text}
            </span>
          ))}
        </div>
      </footer>
    </main>
  );
}
