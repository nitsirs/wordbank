'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchNextCard, submitReview, GRADE, type NextCard } from '@/services/db';
import { ColoredWord } from '@/components/ColoredWord';
import audioQueue from '@/services/audioService';

const QuizPage = () => {
  const [card, setCard] = useState<NextCard | null>(null);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const username = localStorage.getItem('username');
        if (!username) {
          window.location.href = '/';
          return;
        }
        const next = await fetchNextCard();
        if (cancelled) return;
        setCard(next);
        startTimeRef.current = new Date();
        if (next) await audioQueue.preload(next.text);
      } catch (err) {
        console.error('Failed to load card:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleReview = async (grade: 1 | 2 | 3 | 4) => {
    if (busyRef.current || !card) return;
    busyRef.current = true;

    const now = new Date();
    const elapsed = (now.getTime() - (startTimeRef.current?.getTime() || 0)) / 1000;

    // Time-adjusts a "Good" press, matching the original UX.
    let finalGrade = grade;
    if (grade === GRADE.Good) {
      if (elapsed <= 2) finalGrade = GRADE.Easy;
      else if (elapsed > 5) finalGrade = GRADE.Hard;
    }

    const flash =
      finalGrade === GRADE.Again
        ? 'bg-red-100'
        : finalGrade === GRADE.Hard
        ? 'bg-orange-100'
        : finalGrade === GRADE.Good
        ? 'bg-yellow-100'
        : 'bg-green-100';
    setFlashColor(flash);

    try {
      await audioQueue.play(card.text);
    } catch (e) {
      console.error('Audio error:', e);
    }

    try {
      await submitReview(card.wordId, finalGrade as 1 | 2 | 3 | 4, elapsed, card.card, card.againCount);
    } catch (e) {
      console.error('Submit failed:', e);
    }

    setTimeout(async () => {
      setFlashColor(null);
      const next = await fetchNextCard();
      setCard(next);
      startTimeRef.current = new Date();
      if (next) await audioQueue.preload(next.text);
      busyRef.current = false;
    }, 500);
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${flashColor || 'bg-gray-100'}`}>
      <div className="max-w-md w-full relative p-6">
        {card ? (
          <div className="flex flex-col items-center gap-8 bg-white shadow-lg rounded-lg p-10">
            {/* Rotated (for the person across the table) */}
            <div className="absolute top-0 transform -translate-y-20 rotate-180">
              <h1 className="text-6xl font-bold text-center">
                <ColoredWord text={card.text} />
              </h1>
            </div>
            {/* Main word */}
            <h1 className="text-6xl font-bold text-center">
              <ColoredWord text={card.text} />
            </h1>
            <div className="flex gap-4 w-full justify-center">
              <button
                className="bg-red-500 text-white py-4 px-6 rounded-lg text-4xl w-1/2 hover:bg-red-600"
                onClick={() => handleReview(GRADE.Again)}
              >
                ✖
              </button>
              <button
                className="bg-blue-500 text-white py-4 px-6 rounded-lg text-4xl w-1/2 hover:bg-blue-600"
                onClick={() => handleReview(GRADE.Good)}
              >
                ✔
              </button>
            </div>
          </div>
        ) : (
          <p className="text-center text-2xl font-semibold">Loading...</p>
        )}
      </div>
    </div>
  );
};

export default QuizPage;
