'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { getMyDailyStats } from '@/services/db';
import { levelFromXp, currentStreak, bestStreak, badges, type GamifyStats } from '@/lib/gamify';

interface Row {
  username: string;
  reviews: number;
  correct: number;
  distinctWords: number;
  xp: number;
  level: number;
}

const medal = (i: number) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`);

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [me, setMe] = useState<GamifyStats | null>(null);
  const [myUsername, setMyUsername] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = Cookies.get('username') ?? '';
    setMyUsername(u);
    (async () => {
      try {
        const [lbRes, daily] = await Promise.all([
          fetch('/api/leaderboard').then((r) => r.json()),
          getMyDailyStats(60).catch((): { day: string; cards: number; correct: number; seconds: number }[] => []),
        ]);
        setRows((lbRes.rows ?? []) as Row[]);
        const activeDays = daily
          .filter((d) => d.cards > 0)
          .map((d) => d.day);
        const myRow = ((lbRes.rows ?? []) as Row[]).find((r) => r.username === u);
        if (myRow) {
          setMe({
            reviews: myRow.reviews,
            correct: myRow.correct,
            distinctWords: myRow.distinctWords,
            currentStreak: currentStreak(activeDays),
            bestStreak: bestStreak(activeDays),
          });
        }
      } catch (e) {
        console.error('leaderboard load failed:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const li = me ? levelFromXp(me.correct * 12 + Math.max(0, me.reviews - me.correct) * 3) : null;

  return (
    <main className="min-h-[calc(100dvh-3.5rem)] bg-[#F5F6F8] px-4 py-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-[#35389D] text-center">ตารางอันดับ</h1>
      <p className="text-gray-500 text-sm text-center mb-5">ใครอ่านได้เยอะ ใครเก่งที่สุดในห้อง</p>

      {/* my card */}
      {me && li && (
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 border-2 border-[#35389D]">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs text-gray-400">Lv. {li.level.lvl}</p>
              <p className="font-bold text-[#35389D]">{li.level.title}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-[#35389D]">{me.currentStreak}🔥</p>
              <p className="text-[11px] text-gray-400">วันติดต่อกัน</p>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#35389D] rounded-full transition-all"
              style={{ width: `${Math.round(li.progress * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            {li.next ? `เหลือ ${li.xpSpan - li.xpInto} XP ถึง Lv.${li.next.lvl}` : 'ระดับสูงสุดแล้ว'}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {badges(me).map((b) => (
              <span
                key={b.id}
                title={b.label}
                className={`text-xl px-2 py-1 rounded-lg ${b.earned ? '' : 'grayscale opacity-30'}`}
              >
                {b.emoji}
              </span>
            ))}
          </div>
          <div className="flex gap-4 mt-3 text-xs text-gray-500">
            <span>อ่านถูก {me.correct}</span>
            <span>รู้จัก {me.distinctWords} คำ</span>
            <span>ซ้อมยาวสุด {me.bestStreak} วัน</span>
          </div>
        </div>
      )}

      {/* ranking */}
      {loading ? (
        <p className="text-center text-gray-400">กำลังโหลด…</p>
      ) : rows.length === 0 ? (
        <p className="text-center text-gray-400">ยังไม่มีอันดับ ไปฝึกคำก่อนเถอะ!</p>
      ) : (
        <ol className="space-y-2">
          {rows.map((r, i) => {
            const isMe = r.username === myUsername;
            return (
              <li
                key={`${r.username}-${i}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
                  isMe ? 'bg-[#35389D] text-white' : 'bg-white'
                }`}
              >
                <span className={`w-7 text-center font-bold ${isMe ? 'text-white' : 'text-[#35389D]'}`}>
                  {medal(i)}
                </span>
                <span className="flex-1 font-medium truncate">
                  {r.username} <span className={`text-xs ${isMe ? 'text-white/70' : 'text-gray-400'}`}>Lv.{r.level}</span>
                </span>
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
