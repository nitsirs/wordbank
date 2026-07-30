'use client';

import { useState, useEffect, useCallback } from 'react';

type Mode = 'today' | 'all';

interface ClassRow {
  username: string;
  reviewed_total: number;
  mastered_total: number;
  reviewed_today: number;
}

const TOTAL_WORDS = 1600;
const DAILY_GOAL = 30;

// ===== today view (live classroom monitor: who hit the 30-card goal) =====
function ProgressCard({ username, reviewed, done }: { username: string; reviewed: number; done: boolean }) {
  const pct = Math.min((reviewed / DAILY_GOAL) * 100, 100);
  return (
    <div className={`p-4 rounded-xl transition-colors ${done ? 'bg-yellow-100' : 'bg-white'} shadow-sm hover:shadow-md`}>
      <div className="text-center mb-3">
        <h3 className="font-medium text-gray-800">{username}</h3>
        <p className="text-sm text-gray-500">{reviewed}/{DAILY_GOAL}</p>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full transition-all ${done ? 'bg-yellow-400' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ===== all-time view (cumulative mastery + coverage) =====
function MasteryRow({ username, reviewed, mastered }: { username: string; reviewed: number; mastered: number }) {
  const mastery = reviewed > 0 ? (mastered / reviewed) * 100 : 0;
  return (
    <div className="bg-white p-4 rounded-lg shadow-md flex items-center justify-between">
      <div className="flex flex-col">
        <span className="text-lg font-medium">{username}</span>
        <span className="text-sm text-gray-500">{reviewed} / {TOTAL_WORDS} cards reviewed</span>
        <span className="text-sm text-gray-500">
          {mastered} / {reviewed} mastered ({reviewed > 0 ? Math.round((mastered / reviewed) * 100) : 0}%)
        </span>
      </div>
      <div className="w-1/2">
        <div className="bg-gray-200 h-4 rounded-full overflow-hidden relative">
          <div className={`absolute h-full rounded-full ${mastery === 100 ? 'bg-green-500' : 'bg-blue-500'} z-10`} style={{ width: `${(reviewed / TOTAL_WORDS) * 100}%` }} />
          <div className="absolute h-full rounded-full bg-[#ffd700] z-20" style={{ width: `${(mastered / TOTAL_WORDS) * 100}%` }} />
        </div>
      </div>
      <span className="text-lg font-medium ml-4">{Math.round(mastery)}%</span>
    </div>
  );
}

export default function DashboardPage() {
  const [rows, setRows] = useState<ClassRow[]>([]);
  const [mode, setMode] = useState<Mode>('today');
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/class-progress');
      if (res.ok) {
        const data = await res.json();
        setRows(data.rows as ClassRow[]);
        setUnlocked(true);
      }
    } catch {
      /* network error -> leave on whatever state */
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount: try the cookie-based GET. If the teacher unlocked recently
  // (within 8h), this keeps them in without re-entering the PIN.
  useEffect(() => {
    load();
  }, [load]);

  // Today mode only: live 30s auto-refresh (the live classroom board).
  useEffect(() => {
    if (!unlocked || mode !== 'today') return;
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [unlocked, mode, load]);

  const submitPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/class-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        const data = await res.json();
        setRows(data.rows as ClassRow[]);
        setUnlocked(true);
        setPin('');
      } else {
        setError('รหัสไม่ถูกต้อง');
      }
    } catch {
      setError('เชื่อมต่อไม่ได้ ลองอีกครั้ง');
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">กำลังโหลด...</p>
      </main>
    );
  }

  if (!unlocked) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <form onSubmit={submitPin} className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-bold text-center text-[#35389D]">แดชบอร์ดครู</h1>
          <p className="text-sm text-gray-500 text-center">กรุณาใส่รหัสเข้าใช้งาน</p>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="รหัส"
            className="w-full p-3 rounded-lg border border-gray-300 text-center text-lg tracking-widest"
            autoFocus
            required
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button type="submit" className="w-full bg-[#35389D] text-white p-3 rounded-lg font-medium hover:bg-[#2a2c7e] transition-colors">
            เข้าใช้งาน
          </button>
        </form>
      </main>
    );
  }

  const today = rows
    .map((r) => ({ username: r.username, reviewed: r.reviewed_today, done: r.reviewed_today >= DAILY_GOAL }))
    .sort((a, b) => (a.done === b.done ? b.reviewed - a.reviewed : a.done ? 1 : -1));

  const all = rows
    .map((r) => ({ username: r.username, reviewed: r.reviewed_total, mastered: r.mastered_total, mastery: r.reviewed_total > 0 ? (r.mastered_total / r.reviewed_total) * 100 : 0 }))
    .sort((a, b) => b.mastery - a.mastery);

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-3xl font-bold text-gray-900">แดชบอร์ดครู</h1>
          <div className="bg-white rounded-lg p-1 flex shadow-sm">
            <button
              onClick={() => setMode('today')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'today' ? 'bg-[#35389D] text-white' : 'text-gray-600'}`}
            >
              วันนี้
            </button>
            <button
              onClick={() => setMode('all')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'all' ? 'bg-[#35389D] text-white' : 'text-gray-600'}`}
            >
              ทั้งหมด
            </button>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-gray-500 text-center py-8">ไม่พบข้อมูลนักเรียน</p>
        ) : mode === 'today' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {today.map((u) => (
              <ProgressCard key={u.username} username={u.username} reviewed={u.reviewed} done={u.done} />
            ))}
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl">
            {all.map((u) => (
              <MasteryRow key={u.username} username={u.username} reviewed={u.reviewed} mastered={u.mastered} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
