'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getDbInstance } from '@/services/firebaseConfig';
import { ref, get, set } from 'firebase/database';
import { createEmptyCard } from 'ts-fsrs';
import Cookies from 'js-cookie';
import wordList from './wordList.json'; 
import { cleanObject } from '@/utils/cleanObject';
import { analyticsService } from '@/services/analyticsService';

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

  useEffect(() => {
    const savedUsername = Cookies.get('username');
    if (savedUsername) {
      setUsername(savedUsername); // Autofill instead of redirect
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Trim and validate username
    const trimmedUsername = username.trim();
    if (!trimmedUsername) return;

    const userRef = ref(getDbInstance(), `users/${trimmedUsername}`);
    const snapshot = await get(userRef);

    if (!snapshot.exists()) {
      // Initialize new user with word list
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
      analyticsService.logUserSignup(trimmedUsername);
    } else {
      analyticsService.logUserLogin(trimmedUsername);
    }

    // Update stored username in both cookie and localStorage
    Cookies.set('username', trimmedUsername, { expires: 30 });
    localStorage.setItem('username', trimmedUsername);
    
    router.push('/quiz');
  };

  return (
    <main className="min-h-screen bg-[#35389D] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <h1 className="text-white text-5xl font-bold text-center mb-12">บัญชีคำ ป.1</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ใส่ชื่อเล่น"
            className="w-full p-4 rounded-lg text-lg text-center"
            required
          />
          <button
            type="submit"
            className="w-full bg-[#000000] text-white p-4 rounded-lg text-lg font-medium hover:bg-[#222] transition-colors"
          >
            เริ่ม
          </button>
        </form>
      </div>
    </main>
  );
}