'use client';

import { useState, useEffect, useRef } from 'react';
import { ref, get, update } from 'firebase/database';
import { getDbInstance } from '@/services/firebaseConfig';
import { FSRS, Card as FSRSCard } from 'ts-fsrs';
import audioQueue from '@/services/audioService';
import { analyticsService } from '@/services/analyticsService';

// Define Grade enum values since ts-fsrs exports it only as type
enum Grade {
  Again = 1,
  Hard = 2,
  Good = 3,
  Easy = 4
}

interface Word {
  id: string;
  text: string;
  card: FSRSCard;
  againCount?: number;
}

interface WordData {
  text: string;
  card: FSRSCard;
  againCount?: number;
}

interface FirebaseWordEntry {
  [key: string]: WordData;
}

const fsrs = new FSRS({});

// Simplified debug logging
const logCard = (prefix: string, { text, card }: { text: string; card: FSRSCard }) => {
  console.log(`${prefix}:`, {
    text,
    due: card.due ? new Date(card.due).toLocaleString() : 'none',
    reps: card.reps,
    state: card.state
  });
};

export default function QuizPage() {
  const [word, setWord] = useState<Word | null>(null);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [cachedWords, setCachedWords] = useState<FirebaseWordEntry | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  useEffect(() => {
    analyticsService.startSession();
    return () => {
      analyticsService.endSession();
    };
  }, []);

  useEffect(() => {
    const username = localStorage.getItem('username');
    if (username) initializeWords(username);
    else window.location.href = '/';
  }, []);

  const initializeWords = async (username: string) => {
    const userRef = ref(getDbInstance(), `users/${username}`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
      const { words }: { words: FirebaseWordEntry } = snapshot.val();
      setCachedWords(words);
      fetchNextWord(words);
    }
  };

  const preloadNextWords = async (wordsData: FirebaseWordEntry, currentWord: string) => {
    const now = new Date();
    const allWords = Object.entries(wordsData)
      .map(([id, data]) => ({ id, ...data }))
      .filter(w => w.text !== currentWord);

    // Get next due words - reduced from 3 to 2 for mobile optimization
    const nextDueWords = allWords
      .filter(w => w.card.due && new Date(w.card.due) <= now)
      .sort((a, b) => new Date(a.card.due).getTime() - new Date(b.card.due).getTime())
      .slice(0, 2);

    // Get next new word - reduced from 2 to 1 for mobile optimization
    const nextNewWords = allWords
      .filter(w => !w.card.due)
      .slice(0, 1);

    // Preload audio for both due and new words
    await Promise.all([
      ...nextDueWords,
      ...nextNewWords
    ].map(w => audioQueue.preload(w.text)));

    // Clean old cache entries
    await audioQueue.clearOldCache();
  };

  const fetchNextWord = async (wordsData: FirebaseWordEntry) => {
    const now = new Date();
    
    const dueWords = Object.entries(wordsData)
      .map(([id, data]) => ({ id, ...data }))
      .filter(w => w.card.due && new Date(w.card.due) <= now)
      .sort((a, b) => new Date(a.card.due).getTime() - new Date(b.card.due).getTime());

    if (dueWords.length > 0) {
      const nextWord = dueWords[0];
      setWord(nextWord);
      startTimeRef.current = new Date();
      // Preload audio for current word and next words
      await audioQueue.preload(nextWord.text);
      await preloadNextWords(wordsData, nextWord.text);
    } else {
      const newCards = Object.entries(wordsData)
        .map(([id, data]) => ({ id, ...data }))
        .filter(w => !w.card.due)[0];

      if (newCards) {
        newCards.card.due = now;
        setWord(newCards);
        startTimeRef.current = new Date();
        // Preload audio for current word and next words
        await audioQueue.preload(newCards.text);
        await preloadNextWords(wordsData, newCards.text);
      }
    }
  };

  const handleReview = async (grade: Grade) => {
    if (!word || !cachedWords) return;

    const username = localStorage.getItem('username')!;
    const now = new Date();
    const elapsedTime = (now.getTime() - (startTimeRef.current?.getTime() || 0)) / 1000;

    // Track againCount separately from FSRS card
    const againCount = grade === Grade.Again ? ((word.againCount || 0) + 1) : 0;

    // Log analytics for this review with card state
    analyticsService.logCardReview(
      grade.toString(),
      elapsedTime,
      String(word.card.state)
    );

    // Track problem cards
    if (grade === Grade.Again) {
      analyticsService.logProblemCard(word.id, word.text, againCount);
    }

    // Determine grade based on time and button clicked
    let finalGrade = grade;
    if (grade === Grade.Good && elapsedTime <= 3) {
      finalGrade = Grade.Easy;
    }

    // Set color based on rating first
    let color = 'bg-yellow-100'; // Good
    if (finalGrade === Grade.Easy) color = 'bg-green-100';
    if (finalGrade === Grade.Again) color = 'bg-red-100';
    setFlashColor(color);

    // Play audio after setting color
    try {
      await audioQueue.play(word.text);
    } catch (error) {
      console.error('Error playing audio:', error);
    }

    logCard('Before review', word);
    const updatedCard = fsrs.next(word.card, now, finalGrade as unknown as import('ts-fsrs').Grade).card;
    logCard('After review', { text: word.text, card: updatedCard });

    // Update cache and Firebase
    const updatedWords = { ...cachedWords };
    updatedWords[word.id] = { text: word.text, card: updatedCard, againCount };
    setCachedWords(updatedWords);

    const wordRef = ref(getDbInstance(), `users/${username}/words/${word.id}`);
    await update(wordRef, { card: updatedCard });

    setTimeout(() => {
      setFlashColor(null);
      fetchNextWord(updatedWords);
    }, 500);
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${flashColor || 'bg-gray-100'}`}>
      <div className="max-w-md w-full relative p-6">
        {word ? (
          <div className="flex flex-col items-center gap-8 bg-white shadow-lg rounded-lg p-10">
            {/* Rotated Word */}
            <div className="absolute top-0 transform -translate-y-20 rotate-180 text-black-300">
              <h1 className="text-6xl font-bold text-center">{word.text}</h1>
            </div>

            {/* Main Word Display */}
            <h1 className="text-6xl font-bold text-center">{word.text}</h1>

            {/* Buttons */}
            <div className="flex gap-4 w-full justify-center">
              <button
                className="bg-red-500 text-white py-4 px-6 rounded-lg text-4xl w-1/2 hover:bg-red-600"
                onClick={() => handleReview(Grade.Again)}
              >
                ✖
              </button>
              <button
                className="bg-blue-500 text-white py-4 px-6 rounded-lg text-4xl w-1/2 hover:bg-blue-600"
                onClick={() => handleReview(Grade.Good)}
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
}
