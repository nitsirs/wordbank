'use client';

import { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { getDbInstance } from '@/services/firebaseConfig';

interface User {
  username: string;
  totalCards: number;
  reviewedCards: number;
  progress: number;
  masteredCards: number;
}

interface Analytics {
  study_days: number[];
  total_cards_reviewed: number[];
  mastered_cards: number[];
  daily_cards_reviewed: number[];
  daily_session_time: number[];
  words: {
    [key: string]: {
      time_used: number[];
      difficulty: number[];
    };
  };
}

export default function DashboardTeacherPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProgress();
  }, []);

  const fetchUserProgress = async () => {
    setLoading(true);
    const analyticsRef = ref(getDbInstance(), 'analytics');
    const snapshot = await get(analyticsRef);

    if (snapshot.exists()) {
      const analyticsData: { [key: string]: Analytics } = snapshot.val();
      const userList: User[] = Object.entries(analyticsData).map(([username, data]: [string, Analytics]) => {
        const latestIndex = data.study_days.length - 1;
        const TOTAL_AVAILABLE_WORDS = 1600;
        const reviewedCards = data.total_cards_reviewed[latestIndex] || 0;
        const masteredCards = data.mastered_cards[latestIndex] || 0;
        
        // Progress shows the percentage of reviewed cards that are mastered
        const progress = reviewedCards > 0 ? (masteredCards / reviewedCards) * 100 : 0;

        return {
          username,
          totalCards: TOTAL_AVAILABLE_WORDS,
          reviewedCards,
          masteredCards,
          progress
        };
      });

      setUsers(userList.sort((a, b) => b.progress - a.progress));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-8">
      <h1 className="text-3xl font-bold mb-6">Teacher Dashboard</h1>
      {loading ? (
        <p>Loading user progress...</p>
      ) : users.length === 0 ? (
        <p>No users found!</p>
      ) : (
        <div className="w-full max-w-4xl space-y-6">
          {users.map((user) => (
            <div
              key={user.username}
              className="bg-white p-4 rounded-lg shadow-md flex items-center justify-between"
            >
              <div className="flex flex-col">
                <span className="text-lg font-medium">{user.username}</span>
                <span className="text-sm text-gray-500">
                  {user.reviewedCards} / {user.totalCards} cards reviewed
                </span>
                <span className="text-sm text-gray-500">
                  {user.masteredCards} / {user.reviewedCards} cards mastered ({Math.round((user.masteredCards / user.reviewedCards) * 100)}%)
                </span>
              </div>
              <div className="w-1/2">
                <div className="bg-gray-200 h-4 rounded-full overflow-hidden relative">
                  <div
                    className={`absolute h-full rounded-full ${
                      user.progress === 100 ? 'bg-green-500' : 'bg-blue-500'
                    } z-10`}
                    style={{ width: `${user.reviewedCards / user.totalCards * 100}%` }}
                  ></div>
                  <div
                    className="absolute h-full rounded-full bg-[#ffd700] z-20"
                    style={{ width: `${(user.masteredCards / user.totalCards) * 100}%` }}
                  ></div>
                </div>
              </div>
              <span className="text-lg font-medium ml-4">{Math.round(user.progress)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}