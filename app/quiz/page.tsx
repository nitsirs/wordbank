'use client';

import { useState, useEffect, useRef } from 'react';
import { ref, get, update } from 'firebase/database';
import { db } from '@/services/firebaseConfig';
import { FSRS, Rating, Card as FSRSCard } from 'ts-fsrs';

interface Word {
  id: string;
  text: string;
  card: FSRSCard;
}

interface WordData {
  text: string;
  card: FSRSCard;
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
    const username = localStorage.getItem('username');
    if (username) initializeWords(username);
    else window.location.href = '/';
  }, []);

  const initializeWords = async (username: string) => {
    const userRef = ref(db, `users/${username}`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
      const { words }: { words: FirebaseWordEntry } = snapshot.val();
      setCachedWords(words);
      fetchNextWord(words);
    }
  };

  const fetchNextWord = (wordsData: FirebaseWordEntry) => {
    const now = new Date();
    
    const dueWords = Object.entries(wordsData)
      .map(([id, data]) => ({ id, ...data }))
      .filter(w => w.card.due && new Date(w.card.due) <= now)
      .sort((a, b) => new Date(a.card.due).getTime() - new Date(b.card.due).getTime());

    if (dueWords.length > 0) {
      setWord(dueWords[0]);
      startTimeRef.current = new Date();
    } else {
      const newCards = Object.entries(wordsData)
        .map(([id, data]) => ({ id, ...data }))
        .filter(w => !w.card.due)[0];

      if (newCards) {
        newCards.card.due = now;
        setWord(newCards);
        startTimeRef.current = new Date();
      }
    }
  };

  const handleReview = async (rating: Rating) => {
    if (!word || !cachedWords) return;

    const username = localStorage.getItem('username')!;
    const now = new Date();
    const elapsedTime = (now.getTime() - (startTimeRef.current?.getTime() || 0)) / 1000;

    // Determine rating based on time and button clicked
    let finalRating = rating;
    if (rating === Rating.Good && elapsedTime <= 3) {
      finalRating = Rating.Easy;
    }

    logCard('Before review', word);
    const updatedCard = fsrs.next(word.card, now, finalRating).card;
    logCard('After review', { text: word.text, card: updatedCard });

    // Update cache and Firebase
    const updatedWords = { ...cachedWords };
    updatedWords[word.id] = { text: word.text, card: updatedCard };
    setCachedWords(updatedWords);

    const wordRef = ref(db, `users/${username}/words/${word.id}`);
    await update(wordRef, { card: updatedCard });

    // Set color based on rating
    let color = 'bg-yellow-100'; // Good
    if (finalRating === Rating.Easy) color = 'bg-green-100';
    if (finalRating === Rating.Again) color = 'bg-red-100';

    setFlashColor(color);
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
                onClick={() => handleReview(Rating.Again)}
              >
                ✖
              </button>
              <button
                className="bg-blue-500 text-white py-4 px-6 rounded-lg text-4xl w-1/2 hover:bg-blue-600"
                onClick={() => handleReview(Rating.Good)}
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
