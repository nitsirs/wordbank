'use client';

import { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { getDbInstance } from '@/services/firebaseConfig';

interface ProgressCardProps {
  username: string;
  reviewedCards: number;
  totalCards?: number;
  isCompleted?: boolean;
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

function ProgressCard({ username, reviewedCards, totalCards = 30, isCompleted }: ProgressCardProps) {
  const progress = Math.min((reviewedCards / totalCards) * 100, 100);
  
  return (
    <div className={`p-4 rounded-xl transition-colors ${
      isCompleted ? 'bg-yellow-100' : 'bg-white'
    } shadow-sm hover:shadow-md`}>
      <div className="text-center mb-3">
        <h3 className="font-medium text-gray-800">{username}</h3>
        <p className="text-sm text-gray-500">{reviewedCards}/{totalCards}</p>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all ${
            isCompleted ? 'bg-yellow-400' : 'bg-blue-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export default function DailyProgressPage() {
  const [users, setUsers] = useState<ProgressCardProps[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDailyProgress();
  }, []);

  const fetchDailyProgress = async () => {
    setLoading(true);
    const analyticsRef = ref(getDbInstance(), 'analytics');
    const snapshot = await get(analyticsRef);

    if (snapshot.exists()) {
      const analyticsData: { [key: string]: Analytics } = snapshot.val();
      const today = new Date();
      const dateKey = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

      const userProgress = Object.entries(analyticsData).map(([username, data]: [string, Analytics]) => {
        // Get today's reviewed cards from daily_cards_reviewed
        let reviewedToday = 0;
        const lastStudyDayIndex = data.study_days.lastIndexOf(dateKey);
        if (lastStudyDayIndex !== -1) {
          reviewedToday = data.daily_cards_reviewed[lastStudyDayIndex] || 0;
        }

        return {
          username,
          reviewedCards: reviewedToday,
          totalCards: 30,
          isCompleted: reviewedToday >= 30
        };
      });

      // Sort by completion status and then by number of reviewed cards
      setUsers(userProgress.sort((a, b) => {
        if (a.isCompleted === b.isCompleted) {
          return b.reviewedCards - a.reviewedCards;
        }
        return b.isCompleted ? 1 : -1;
      }));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">ความคืบหน้าประจำวัน</h1>
        
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">กำลังโหลด...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">ไม่พบข้อมูลผู้ใช้</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {users.map((user) => (
              <ProgressCard key={user.username} {...user} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}