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
 * The kid reads each word aloud; the adult across the table ticks ✔/✖. The
 * client-side fluency engine (lib/fluency.ts) picks each next word to land near
 * the ~80% success zone, weighted toward the weak band with a steady drip of new
 * words. Colors come from word_bank.segments (curated ครูกาญ 4-color). FSRS runs
 * only as a maintenance side input (services/db.ts submitPracticeReview).
 */
export default function P1PracticePage() {
  const [words, setWords] = useState<FluencyWord[]>([]);
  const [stack, setStack] = useState<FluencyWord[]>([]); // shown history; last = current
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [usedAudio, setUsedAudio] = useState(false);

  const drumRef = useRef<HTMLDivElement>(null);
  const currentSlotRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number | null>(null);
  const busyRef = useRef(false);

  // current = last shown word
  const current = stack.length ? stack[stack.length - 1] : null;

  // load the p1 pool once, pick the first word
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
          setStack([first]);
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

  // center the current slot whenever the stack grows → the drum slide
  useEffect(() => {
    currentSlotRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [stack.length]);

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
      console.error('submit failed:', e)
    );

    const next = pickNext(updated, { excludeId: current.id });
    if (next) {
      setStack((s) => [...s, next]);
      setUsedAudio(false);
      startTimeRef.current = Date.now();
      audioQueue.preload(next.text).catch(() => {});
    }

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
    <main className="relative min-h-screen bg-[#F5F6F8] flex flex-col items-center pb-8">
      {/* adult view across the table: the current word, rotated 180° */}
      {current && (
        <div className="w-full flex justify-center pt-3">
          <div className="rotate-180 text-3xl font-bold text-[#35389D]">
            <ColoredWord segments={current.segments ?? undefined} text={current.text} />
          </div>
        </div>
      )}

      <header className="text-center my-2">
        <h1 className="text-xl font-bold text-[#35389D]">บัญชีคำ ป.1 — อ่านออกเสียง</h1>
        <p className="text-gray-500 text-sm">ให้ลูกอ่านเสียงดัง • ผู้ใหญ่กด ✔ หรือ ✖</p>
      </header>

      {/* kid view: the drum */}
      <div className={styles.drum} ref={drumRef}>
        {stack.map((w, i) => (
          <div
            key={`${w.id}-${i}`}
            ref={i === stack.length - 1 ? currentSlotRef : undefined}
            className={styles.slot}
          >
            <h2 className="text-6xl font-bold text-center px-4">
              <ColoredWord segments={w.segments ?? undefined} text={w.text} />
            </h2>
          </div>
        ))}
      </div>

      {/* controls */}
      <div className="mt-3 flex flex-col items-center gap-4 w-full max-w-md px-4">
        <button
          onClick={playAudio}
          disabled={!current}
          className={`flex items-center gap-2 px-5 py-2 rounded-full text-white font-medium transition-colors ${
            usedAudio ? 'bg-[#35389D]' : 'bg-gray-400 hover:bg-gray-500'
          } disabled:opacity-50`}
        >
          <Volume2 className="w-5 h-5" />
          ฟังเสียง
        </button>

        <div className="flex gap-4 w-full">
          <button
            onClick={() => handleReview(false)}
            disabled={!current}
            className="bg-red-500 text-white py-5 rounded-2xl text-4xl w-1/2 hover:bg-red-600 active:scale-95 transition disabled:opacity-50"
            aria-label="อ่านไม่ได้"
          >
            ✖
          </button>
          <button
            onClick={() => handleReview(true)}
            disabled={!current}
            className="bg-green-500 text-white py-5 rounded-2xl text-4xl w-1/2 hover:bg-green-600 active:scale-95 transition disabled:opacity-50"
            aria-label="อ่านได้"
          >
            ✔
          </button>
        </div>

        <p className="text-gray-500 text-sm">อ่านแล้ว {Math.max(0, stack.length - 1)} คำ</p>
      </div>
    </main>
  );
}
