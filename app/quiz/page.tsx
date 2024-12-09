'use client';

import { useState, useEffect, useRef } from 'react';
import { ref, get, update } from 'firebase/database';
import { db } from '@/services/firebaseConfig';
import { FSRS, createEmptyCard, Rating } from 'ts-fsrs';

interface Word {
  id: string;
  text: string;
  card: any; // TS-FSRS card type
}

const fsrs = new FSRS();

export default function QuizPage() {
  const [word, setWord] = useState<Word | null>(null); // Current word to review
  const [flashColor, setFlashColor] = useState<string | null>(null); // Feedback flash color
  const startTimeRef = useRef<Date | null>(null); // Track start time for timing responses

  // Fetch the first word on component mount
  useEffect(() => {
    const username = localStorage.getItem('username');
    if (username) {
      fetchNextWord(username);
    } else {
      window.location.href = '/'; // Redirect to onboarding if no username
    }
  }, []);

  const fetchNextWord = async (username: string) => {
    const userRef = ref(db, `users/${username}`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
      const { words } = snapshot.val();
      const wordEntries = Object.entries(words);

      const now = new Date();

      // Separate due cards and new cards
      const dueWords = wordEntries
        .map(([id, data]: [string, any]) => ({
          id,
          text: data.text,
          card: data.card,
        }))
        .filter((w) => w.card.due && new Date(w.card.due) <= now)
        .sort((a, b) => new Date(a.card.due).getTime() - new Date(b.card.due).getTime());

      const newCards = wordEntries
        .map(([id, data]: [string, any]) => ({
          id,
          text: data.text,
          card: data.card,
        }))
        .filter((w) => !w.card.due)
        .sort((a, b) => parseInt(a.id.replace('wordId', '')) - parseInt(b.id.replace('wordId', ''))); // Sort by zero-padded IDs

      if (dueWords.length > 0) {
        setWord(dueWords[0]); // Set the first due card
        startTimeRef.current = new Date(); // Start the timer
      } else if (newCards.length > 0) {
        const newCard = newCards[0];
        const defaultDueDate = now.toISOString();
        newCard.card.due = defaultDueDate;

        // Update Firebase with the new card's `due` date
        const wordRef = ref(db, `users/${username}/words/${newCard.id}`);
        await update(wordRef, { card: newCard.card });

        setWord(newCard); // Set the new card
        startTimeRef.current = new Date(); // Start the timer
      } else {
        alert('No more cards to review!');
      }
    }
  };

  const handleWrong = async () => {
    if (!word) return;

    const username = localStorage.getItem('username')!;
    const now = new Date();

    // Update the card as "Again"
    const updatedCard = fsrs.next(word.card, now, Rating.Again).card;

    // Update Firebase with the updated card
    const wordRef = ref(db, `users/${username}/words/${word.id}`);
    await update(wordRef, { card: updatedCard });

    // Flash red feedback and fetch the next word
    setFlashColor('bg-red-500');
    setTimeout(() => {
      setFlashColor(null);
      fetchNextWord(username);
    }, 500);
  };

  const handleCorrect = async () => {
    if (!word) return;

    const username = localStorage.getItem('username')!;
    const now = new Date();
    const elapsedTime = (now.getTime() - (startTimeRef.current?.getTime() || 0)) / 1000; // Time in seconds

    const rating = elapsedTime <= 3 ? Rating.Easy : Rating.Good;

    // Update the card with appropriate rating
    const updatedCard = fsrs.next(word.card, now, rating).card;

    // Update Firebase with the updated card
    const wordRef = ref(db, `users/${username}/words/${word.id}`);
    await update(wordRef, { card: updatedCard });

    // Flash green for Easy and yellow for Good
    setFlashColor(rating === Rating.Easy ? 'bg-green-500' : 'bg-yellow-500');
    setTimeout(() => {
      setFlashColor(null);
      fetchNextWord(username);
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
                onClick={handleWrong}
              >
                ✖
              </button>
              <button
                className="bg-blue-500 text-white py-4 px-6 rounded-lg text-4xl w-1/2 hover:bg-blue-600"
                onClick={handleCorrect}
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