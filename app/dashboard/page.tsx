'use client';

import { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '@/services/firebaseConfig';

interface User {
  username: string;
  totalCards: number;
  reviewedCards: number;
  progress: number; // Added for easier sorting
}

export default function DashboardPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProgress();
  }, []);

  const fetchUserProgress = async () => {
    setLoading(true);
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);

    if (snapshot.exists()) {
      const usersData = snapshot.val();
      const userList: User[] = Object.entries(usersData).map(([username, data]: [string, any]) => {
        const words = data.words || {};
        const totalCards = Object.keys(words).length;
        const reviewedCards = Object.values(words).filter(
          (word: any) => word.card.last_review // Card has been reviewed at least once
        ).length;

        const progress = totalCards > 0 ? (reviewedCards / totalCards) * 100 : 0;

        return {
          username,
          totalCards,
          reviewedCards,
          progress,
        };
      });

      // Sort users by progress in descending order
      const sortedUsers = userList.sort((a, b) => b.progress - a.progress);

      setUsers(sortedUsers);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-8">
      <h1 className="text-3xl font-bold mb-6">User Progress Dashboard</h1>
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
              </div>
              <div className="w-1/2">
                <div className="bg-gray-200 h-4 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      user.progress === 100 ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${user.progress}%` }}
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