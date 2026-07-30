'use client';

import { useState, useEffect, useRef } from 'react';
import { Volume2, Mic, Square } from 'lucide-react';
import { ColoredWord } from '@/components/ColoredWord';
import audioQueue from '@/services/audioService';
import { fetchPracticeProgress, submitPracticeReview, GRADE } from '@/services/db';
import { pickNext, type FluencyWord, type FluencyStats } from '@/lib/fluency';
import type * as SpeechSdk from 'microsoft-cognitiveservices-speech-sdk';
import styles from './p1.module.css';

/**
 * บัญชีคำ ป.1 — อ่านออกเสียง (production mode) + always-on auto-tick.
 *
 * Layout (2026-07-30 redesign):
 * - Kid zone: current word FIXED + centered, flipped 180° for the kid across the
 *   table, rolls in smoothly on each advance. Faded "ต่อไป" peek to read ahead.
 * - Parent/teacher bar: compact horizontal slide of the upcoming queue (bottom).
 *
 * Always-on ASR (2026-07-31): "เริ่มฟัง" opens the mic → continuous th-TH STT
 * (token auth, key stays server-side) → on each recognized phrase, segment with a
 * dictionary-constrained longest-match against the p1 pool → exact-match the
 * current target → auto-tick ✔. Manual ✖/✔ stay as override.
 */
export default function P1PracticePage() {
  const [words, setWords] = useState<FluencyWord[]>([]);
  const [seen, setSeen] = useState(0);
  const [current, setCurrent] = useState<FluencyWord | null>(null);
  const [queue, setQueue] = useState<FluencyWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [usedAudio, setUsedAudio] = useState(false);
  const [listening, setListening] = useState(false);
  const [listenError, setListenError] = useState<string | null>(null);

  const startTimeRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const recognizerRef = useRef<SpeechSdk.SpeechRecognizer | null>(null);
  const currentRef = useRef<FluencyWord | null>(null);
  const dictRef = useRef<string[]>([]);
  const handleReviewRef = useRef<(correct: boolean) => void>(() => {});

  const norm = (s: string) => (s || '').replace(/[\s\p{P}]/gu, '');

  // dictionary-constrained longest-match tokenizer (dict = p1 word pool).
  // Longest-match picks ตาก over ตา, killing nesting false-fires.
  const segment = (stream: string, dict: string[]): string[] => {
    const out: string[] = [];
    let i = 0;
    while (i < stream.length) {
      const hit = dict.find((w) => w.length > 0 && stream.startsWith(w, i));
      if (hit) {
        out.push(hit);
        i += hit.length;
      } else {
        i++;
      }
    }
    return out;
  };

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

  // keep the segmenter dictionary fresh
  useEffect(() => {
    const set = new Set<string>();
    words.forEach((w) => set.add(norm(w.text)));
    dictRef.current = [...set].sort((a, b) => b.length - a.length);
  }, [words]);

  // stop the recognizer if the page unmounts
  useEffect(() => {
    return () => {
      const rec = recognizerRef.current;
      recognizerRef.current = null;
      if (rec) {
        try {
          rec.stopContinuousRecognitionAsync(() => rec.close(), () => rec.close());
        } catch {
          try { rec.close(); } catch {}
        }
      }
    };
  }, []);

  const next = queue[0] ?? null;

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

    submitPracticeReview(current.id, grade, elapsed, usedAudio).catch((e) =>
      console.error('submit failed:', e),
    );

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

  // keep ref mirrors fresh for the recognizer callback (avoids stale closures)
  currentRef.current = current;
  handleReviewRef.current = handleReview;

  const startListening = async () => {
    setListenError(null);
    try {
      const sdk: typeof SpeechSdk = await import('microsoft-cognitiveservices-speech-sdk');
      const r = await fetch('/api/speech-token');
      if (!r.ok) throw new Error('ไม่ได้รับ token');
      const { token, region } = await r.json();

      const sc = sdk.SpeechConfig.fromAuthorizationToken(token, region);
      sc.speechRecognitionLanguage = 'th-TH';
      sc.outputFormat = sdk.OutputFormat.Detailed;
      const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new sdk.SpeechRecognizer(sc, audioConfig);

      recognizer.recognized = (_s, evt) => {
        if (evt.result.reason !== sdk.ResultReason.RecognizedSpeech) return;
        const tokens = segment(norm(evt.result.text), dictRef.current);
        const cur = currentRef.current;
        if (cur && tokens.includes(norm(cur.text))) {
          handleReviewRef.current(true); // auto-tick ✔ + advance
        }
      };
      recognizer.canceled = (_s, evt) => {
        if (evt.reason === sdk.CancellationReason.Error) {
          setListenError(evt.errorDetails || 'mic/recognizer error');
        }
      };

      await new Promise<void>((res, rej) =>
        recognizer.startContinuousRecognitionAsync(res, rej),
      );
      recognizerRef.current = recognizer;
      setListening(true);
    } catch (e: unknown) {
      setListenError(e instanceof Error ? e.message : String(e));
    }
  };

  const stopListening = () => {
    const rec = recognizerRef.current;
    recognizerRef.current = null;
    setListening(false);
    if (rec) {
      rec.stopContinuousRecognitionAsync(() => rec.close(), () => rec.close());
    }
  };

  const toggleListening = () => (listening ? stopListening() : startListening());

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
      <header className="text-center pt-3 pb-1 shrink-0">
        <h1 className="text-sm font-semibold text-[#35389D]">บัญชีคำ ป.1 — อ่านออกเสียง</h1>
      </header>

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

      <div className="flex flex-col items-center gap-3 w-full max-w-md mx-auto px-4 pb-3 shrink-0">
        {/* always-on mic */}
        <button
          onClick={toggleListening}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-medium ${
            listening ? 'bg-red-500 hover:bg-red-600' : 'bg-[#35389D] hover:opacity-90'
          }`}
        >
          {listening ? <Square className="w-4 h-4" /> : <Mic className="w-5 h-5" />}
          {listening ? 'หยุดฟัง' : 'เริ่มฟัง'}
        </button>
        {listening && (
          <p className="text-[#35389D] text-xs flex items-center gap-2">
            <span className="animate-pulse">●</span> กำลังฟัง… ให้ลูกอ่านคำให้ดัง ๆ
          </p>
        )}
        {listenError && <p className="text-red-500 text-xs text-center">{listenError}</p>}

        <button
          onClick={playAudio}
          disabled={!current}
          className={`flex items-center gap-2 px-5 py-2 rounded-full text-white text-sm font-medium ${
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
