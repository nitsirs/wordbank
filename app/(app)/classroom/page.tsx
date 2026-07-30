'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { createClass, joinClass, getClassLeaderboard, type ClassRow } from '@/services/classroom';
import { levelFromXp } from '@/lib/gamify';

const medal = (i: number) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`);

export default function ClassroomPage() {
  const [code, setCode] = useState('');
  const [rows, setRows] = useState<ClassRow[]>([]);
  const [joinInput, setJoinInput] = useState('');
  const [createInput, setCreateInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const myUsername = typeof window !== 'undefined' ? Cookies.get('username') ?? '' : '';

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('username')) {
      window.location.href = '/';
      return;
    }
    const saved = localStorage.getItem('class_code');
    if (saved) enterClass(saved).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enterClass = async (c: string) => {
    setBusy(true);
    setErr(null);
    try {
      const r = await getClassLeaderboard(c);
      setCode(c);
      setRows(r);
      localStorage.setItem('class_code', c);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onJoin = async () => {
    const c = joinInput.trim();
    if (!c || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await joinClass(c);
      if (!r) {
        setErr('ไม่พบรหัสห้องนี้');
        setBusy(false);
        return;
      }
      await enterClass(c);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  const onCreate = async () => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await createClass(createInput.trim() || 'ห้องเรียน');
      await enterClass(r.code);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  const leave = () => {
    localStorage.removeItem('class_code');
    setCode('');
    setRows([]);
  };

  if (!code) {
    return (
      <main className="min-h-[calc(100dvh-3.5rem)] bg-[#F5F6F8] px-4 py-8 max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-[#35389D] text-center mb-1">ห้องเรียน</h1>
        <p className="text-gray-500 text-sm text-center mb-8">แข่งกันในห้อง — ใครอ่านได้เยอะที่สุด</p>

        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <p className="font-medium text-[#35389D] mb-2">เข้าห้อง (นักเรียน)</p>
          <input
            value={joinInput}
            onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
            placeholder="รหัสห้อง"
            className="w-full p-3 rounded-lg border border-gray-200 text-center tracking-widest mb-3 uppercase"
          />
          <button onClick={onJoin} disabled={busy} className="w-full py-3 rounded-xl bg-[#35389D] text-white font-medium hover:opacity-90 disabled:opacity-50">
            เข้าห้อง
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="font-medium text-[#35389D] mb-2">สร้างห้อง (ครู)</p>
          <input
            value={createInput}
            onChange={(e) => setCreateInput(e.target.value)}
            placeholder="ชื่อห้อง เช่น ป.1/2"
            className="w-full p-3 rounded-lg border border-gray-200 mb-3"
          />
          <button onClick={onCreate} disabled={busy} className="w-full py-3 rounded-xl bg-gray-800 text-white font-medium hover:opacity-90 disabled:opacity-50">
            สร้างห้อง
          </button>
        </div>

        {err && <p className="text-red-500 text-sm text-center mt-4">{err}</p>}
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100dvh-3.5rem)] bg-[#F5F6F8] px-4 py-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[#35389D]">ห้องเรียน</h1>
        <button onClick={leave} className="text-sm text-gray-400 underline">ออกจากห้อง</button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-5 text-center">
        <p className="text-xs text-gray-400">รหัสห้อง — แชร์ให้เพื่อนเข้าร่วม</p>
        <p className="text-3xl font-bold tracking-[0.3em] text-[#35389D] my-1">{code}</p>
      </div>

      {rows.length === 0 ? (
        <p className="text-center text-gray-400">ยังไม่มีคนในห้อง ชวนเพื่อนเข้าด้วยรหัสข้างบน!</p>
      ) : (
        <ol className="space-y-2">
          {rows.map((r, i) => {
            const isMe = r.username === myUsername;
            return (
              <li key={`${r.username}-${i}`} className={`flex items-center gap-3 px-4 py-3 rounded-xl ${isMe ? 'bg-[#35389D] text-white' : 'bg-white'}`}>
                <span className={`w-7 text-center font-bold ${isMe ? 'text-white' : 'text-[#35389D]'}`}>{medal(i)}</span>
                <span className="flex-1 font-medium truncate">{r.username}</span>
                <span className={`text-sm ${isMe ? 'text-white/90' : 'text-gray-500'}`}>{r.correct} ถูก</span>
                <span className={`text-sm font-bold ${isMe ? 'text-white' : 'text-[#35389D]'}`}>{r.xp} XP</span>
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
