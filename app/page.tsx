'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/services/firebaseConfig';
import { ref, get, set } from 'firebase/database';
import { createEmptyCard } from 'ts-fsrs';
import wordList from './wordList.json'; 
import { cleanObject } from '@/utils/cleanObject'; 

interface Card {
  due?: Date;
}

interface WordEntry {
  text: string;
  card: Card;
}

interface WordDictionary {
  [key: string]: WordEntry;
}

export default function OnboardingPage() {
  const [username, setUsername] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const userRef = ref(db, `users/${username}`);
    const snapshot = await get(userRef);

    if (!snapshot.exists()) {
      const initializedWords = wordList.reduce<WordDictionary>((acc, word, index) => {
        let card = createEmptyCard();
        card.due = undefined;
        card = cleanObject(card);

        const paddedId = `wordId${String(index + 1).padStart(4, '0')}`;
        acc[paddedId] = {
          text: word,
          card,
        };
        return acc;
      }, {});

      await set(userRef, { words: initializedWords });
      console.log(`Initialized user: ${username}`);
    }

    localStorage.setItem('username', username);
    router.push(`/quiz`);
  };

  return (
    <main className="min-h-screen bg-[#FF6B00] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <h1 className="text-white text-5xl font-bold text-center mb-12">Welcome</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your name"
            className="w-full p-4 rounded-lg text-lg text-center"
            required
          />
          <button
            type="submit"
            className="w-full bg-[#333] text-white p-4 rounded-lg text-lg font-medium hover:bg-[#222] transition-colors"
          >
            Start
          </button>
        </form>
      </div>
    </main>
  );
}