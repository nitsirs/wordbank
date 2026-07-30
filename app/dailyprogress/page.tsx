'use client';

import { useState, useEffect, useCallback } from 'react';
import { getClassProgress } from '@/services/db';

const DAILY_GOAL = 30;

interface ProgressCardProps {
  username: string;
  reviewedCards: number;
  isCompleted: boolean;
}

function ProgressCard({ username, reviewedCards, isCompleted }: ProgressCardProps) {
  const progress = Math.min((reviewedCards / DAILY_GOAL) * 100, 100);
  return (
    <div className={`p-4 rounded-xl transition-colors ${isCompleted ? 'bg-yellow-100' : 'bg-white'} shadow-sm hover:shadow-md`}>
      <div className="text-center mb-3">
        <h3 className="font-medium text-gray-800">{username}</h3>
        <p className="text-sm text-gray-500">{reviewedCards}/{DAILY_GOAL}</p>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full transition-all ${isCompleted ? 'bg-yellow-400' : 'bg-blue-500'}`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

export default function DailyProgressPage() {
  const [users, setUsers] = useState<ProgressCardProps[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const rows = await getClassProgress();
      const list: ProgressCardProps[] = rows.map((r) => ({
        username: r.username,
        reviewedCards: r.reviewed_today,
        isCompleted: r.reviewed_today >= DAILY_GOAL,
      }));
      list.sort((a, b) => (a.isCompleted === b.isCompleted ? b.reviewedCards - a.reviewedCards : a.isCompleted ? 1 : -1));
      setUsers(list);
    } catch (e) {
      console.error('Failed to load daily progress:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30000); // auto-refresh for the teacher view
    return () => clearInterval(t);
  }, [refresh]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">ความคืบหน้าประจำวัน</h1>
        {loading ? (
          <p className="text-gray-500 text-center py-8">กำลังโหลด...</p>
        ) : users.length === 0 ? (
          <p className="text-gray-500 text-center py-8">ไม่พบข้อมูลผู้ใช้</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {users.map((u) => (
              <ProgressCard key={u.username} {...u} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
