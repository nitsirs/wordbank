'use client';

import { useState, useEffect, useCallback } from 'react';

type Mode = 'today' | 'all';

interface ClassRow {
  username: string;
  cohort_year: number | null;
  reviewed_total: number;
  mastered_total: number;
  reviewed_today: number;
  is_archived: boolean;
}

const TOTAL_WORDS = 1600;
const DAILY_GOAL = 30;

async function archive(username: string, archived: boolean) {
  const res = await fetch('/api/student-archive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, archived }),
  });
  if (!res.ok) throw new Error('archive failed');
}

// ===== today view (live classroom monitor: who hit the 30-card goal) =====
function ProgressCard({
  username,
  reviewed,
  done,
  onArchive,
  busy,
}: {
  username: string;
  reviewed: number;
  done: boolean;
  onArchive: () => void;
  busy: boolean;
}) {
  const pct = Math.min((reviewed / DAILY_GOAL) * 100, 100);
  return (
    <div className={`p-4 rounded-xl transition-colors ${done ? 'bg-yellow-100' : 'bg-white'} shadow-sm hover:shadow-md`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-center flex-1">
          <h3 className="font-medium text-gray-800">{username}</h3>
          <p className="text-sm text-gray-500">{reviewed}/{DAILY_GOAL}</p>
        </div>
        <button
          onClick={onArchive}
          disabled={busy}
          title="ซ่อนออกจากแดชบอร์ด"
          className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-40 px-2"
        >
          {busy ? '…' : 'ซ่อน'}
        </button>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full transition-all ${done ? 'bg-yellow-400' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ===== all-time view (cumulative mastery + coverage) =====
function MasteryRow({
  username,
  reviewed,
  mastered,
  onArchive,
  busy,
}: {
  username: string;
  reviewed: number;
  mastered: number;
  onArchive: () => void;
  busy: boolean;
}) {
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
      <div className="flex items-center gap-3">
        <span className="text-lg font-medium">{Math.round(mastery)}%</span>
        <button
          onClick={onArchive}
          disabled={busy}
          title="ซ่อนออกจากแดชบอร์ด"
          className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-40"
        >
          {busy ? '…' : 'ซ่อน'}
        </button>
      </div>
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
  const [archiving, setArchiving] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/class-progress');
      if (res.ok) {
        const data = await res.json();
        setRows(data.rows as ClassRow[]);
        setUnlocked(true);
      }
    } catch {
      /* network error -> leave state as-is */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Today mode: live 30s auto-refresh.
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

  const toggleArchive = async (username: string, archived: boolean) => {
    setArchiving(username);
    try {
      await archive(username, archived);
      await load();
    } catch {
      /* ignore - state unchanged */
    } finally {
      setArchiving(null);
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

  const active = rows.filter((r) => !r.is_archived);
  const archivedRows = rows.filter((r) => r.is_archived);

  // group active by cohort_year, newest cohort first; null cohort -> 0 (sorts last)
  const years = Array.from(new Set(active.map((r) => r.cohort_year ?? 0))).sort((a, b) => b - a);

  const todayFor = (rs: ClassRow[]) =>
    rs
      .map((r) => ({ row: r, reviewed: r.reviewed_today, done: r.reviewed_today >= DAILY_GOAL }))
      .sort((a, b) => (a.done === b.done ? b.reviewed - a.reviewed : a.done ? 1 : -1));

  const allFor = (rs: ClassRow[]) =>
    rs
      .map((r) => ({
        row: r,
        reviewed: r.reviewed_total,
        mastered: r.mastered_total,
        mastery: r.reviewed_total > 0 ? (r.mastered_total / r.reviewed_total) * 100 : 0,
      }))
      .sort((a, b) => b.mastery - a.mastery);

  const renderCohort = (year: number) => {
    const cohortRows = active.filter((r) => (r.cohort_year ?? 0) === year);
    const label = year ? `รุ่น ${year}` : 'ไม่ระบุปี';
    return (
      <section key={year} className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">
          {label} <span className="text-gray-400 font-normal text-base">({cohortRows.length} คน)</span>
        </h2>
        {mode === 'today' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {todayFor(cohortRows).map(({ row, reviewed, done }) => (
              <ProgressCard
                key={row.username}
                username={row.username}
                reviewed={reviewed}
                done={done}
                busy={archiving === row.username}
                onArchive={() => toggleArchive(row.username, true)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3 max-w-4xl">
            {allFor(cohortRows).map(({ row, reviewed, mastered }) => (
              <MasteryRow
                key={row.username}
                username={row.username}
                reviewed={reviewed}
                mastered={mastered}
                busy={archiving === row.username}
                onArchive={() => toggleArchive(row.username, true)}
              />
            ))}
          </div>
        )}
      </section>
    );
  };

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

        {active.length === 0 ? (
          <p className="text-gray-500 text-center py-8">ไม่พบข้อมูลนักเรียน</p>
        ) : (
          years.map(renderCohort)
        )}

        {archivedRows.length > 0 && (
          <section className="mt-8 border-t pt-6">
            <button
              onClick={() => setShowArchived((s) => !s)}
              className="text-gray-500 hover:text-gray-700 font-medium"
            >
              {showArchived ? '▼' : '▶'} ซ่อนไว้ ({archivedRows.length})
            </button>
            {showArchived && (
              <div className="mt-3 flex flex-wrap gap-2">
                {archivedRows.map((r) => (
                  <span key={r.username} className="inline-flex items-center gap-2 bg-gray-200 rounded-full px-3 py-1 text-sm text-gray-600">
                    {r.username}
                    <button
                      onClick={() => toggleArchive(r.username, false)}
                      disabled={archiving === r.username}
                      className="text-[#35389D] hover:underline disabled:opacity-40"
                    >
                      {archiving === r.username ? '…' : 'กู้คืน'}
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
