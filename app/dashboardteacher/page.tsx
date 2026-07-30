'use client';

import { useState, useEffect } from 'react';
import { getClassProgress } from '@/services/db';

const TOTAL_AVAILABLE_WORDS = 1600;

interface User {
  username: string;
  reviewedCards: number;
  masteredCards: number;
  progress: number;
}

export default function DashboardTeacherPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const rows = await getClassProgress();
        const list: User[] = rows.map((r) => ({
          username: r.username,
          reviewedCards: r.reviewed_total,
          masteredCards: r.mastered_total,
          progress: r.reviewed_total > 0 ? (r.mastered_total / r.reviewed_total) * 100 : 0,
        }));
        setUsers(list.sort((a, b) => b.progress - a.progress));
      } catch (e) {
        console.error('Failed to load progress:', e);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-8">
      <h1 className="text-3xl font-bold mb-6">Teacher Dashboard</h1>
      {loading ? (
        <p>Loading user progress...</p>
      ) : users.length === 0 ? (
        <p>No users found!</p>
      ) : (
        <div className="w-full max-w-4xl space-y-6">
          {users.map((u) => (
            <div key={u.username} className="bg-white p-4 rounded-lg shadow-md flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-lg font-medium">{u.username}</span>
                <span className="text-sm text-gray-500">{u.reviewedCards} / {TOTAL_AVAILABLE_WORDS} cards reviewed</span>
                <span className="text-sm text-gray-500">
                  {u.masteredCards} / {u.reviewedCards} mastered ({u.reviewedCards > 0 ? Math.round((u.masteredCards / u.reviewedCards) * 100) : 0}%)
                </span>
              </div>
              <div className="w-1/2">
                <div className="bg-gray-200 h-4 rounded-full overflow-hidden relative">
                  <div className={`absolute h-full rounded-full ${u.progress === 100 ? 'bg-green-500' : 'bg-blue-500'} z-10`} style={{ width: `${(u.reviewedCards / TOTAL_AVAILABLE_WORDS) * 100}%` }} />
                  <div className="absolute h-full rounded-full bg-[#ffd700] z-20" style={{ width: `${(u.masteredCards / TOTAL_AVAILABLE_WORDS) * 100}%` }} />
                </div>
              </div>
              <span className="text-lg font-medium ml-4">{Math.round(u.progress)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
