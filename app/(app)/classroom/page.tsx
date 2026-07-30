'use client';

import { useState } from 'react';
import { Check, X, Forward, Flag, RotateCcw } from 'lucide-react';
import { ColoredWord } from '@/components/ColoredWord';

/**
 * Projector team-game mode (classroom, teacher-facilitated).
 * One screen at the front, 22 kids in teams, the teacher judges + drives.
 * Gamification = team-vs-team (Octalysis drive 5) + streak bonus (drives 2/6/8).
 * Teacher-judged scoring (reliable in a noisy classroom); mostly client-side.
 *
 * NOTE: supersedes the earlier per-device join-by-code classroom. That
 * services/classroom.ts + classrooms schema stay for a possible home/individual
 * mode later.
 */

const COLORS = [
  { name: 'ทีมแดง', bg: 'bg-red-500', soft: 'bg-red-50', text: 'text-red-600', border: 'border-red-400' },
  { name: 'ทีมน้ำเงิน', bg: 'bg-blue-500', soft: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-400' },
  { name: 'ทีมเขียว', bg: 'bg-emerald-500', soft: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-400' },
  { name: 'ทีมเหลือง', bg: 'bg-amber-500', soft: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-400' },
  { name: 'ทีมม่วง', bg: 'bg-purple-500', soft: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-400' },
  { name: 'ทีมส้ม', bg: 'bg-orange-500', soft: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-400' },
];

// Local ป.1 word bank (auto-colored by ColoredWord). Enough variety for a game.
const WORDS = [
  'ม้า', 'นก', 'น้ำ', 'บ้าน', 'ตา', 'แม่', 'ปลา', 'ไก่', 'หมา', 'รถ',
  'ต้นไม้', 'ข้าว', 'หนังสือ', 'ดินสอ', 'ปากกา', 'ลูกโป่ง', 'ว่าว', 'ลม', 'ฝน', 'ดาว',
  'ครู', 'เพื่อน', 'โรงเรียน', 'กระดาน', 'ไม้บรรทัด', 'ยางลบ', 'อ่าน', 'เขียน', 'วาด', 'เล่น',
  'กิน', 'นอน', 'ตื่น', 'นั่ง', 'ยืน', 'เดิน', 'วิ่ง', 'กระโดด', 'พูด', 'ฟัง',
  'กบ', 'เป็ด', 'ห่าน', 'วัว', 'ควาย', 'แกะ', 'มด', 'ผึ้ง', 'ผีเสื้อ', 'ปู',
  'ไก่งวง', 'นกฮูก', 'กระต่าย', 'เสือ', 'ช้าง', 'ม้าลาย', 'ยีราฟ', 'ฮิปโป', 'จระเข้', 'ปลาโลมา',
];

interface Team {
  name: string;
  bg: string;
  soft: string;
  text: string;
  border: string;
  score: number;
  streak: number;
}

type Phase = 'setup' | 'play' | 'done';

export default function ClassroomGamePage() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [teamCount, setTeamCount] = useState(4);
  const [names, setNames] = useState<string[]>(COLORS.map((c) => c.name));
  const [teams, setTeams] = useState<Team[]>([]);
  const [wordIdx, setWordIdx] = useState(0);
  const [current, setCurrent] = useState(0);
  const [round, setRound] = useState(0);

  const start = () => {
    const ts: Team[] = COLORS.slice(0, teamCount).map((c, i) => ({
      ...c,
      name: names[i]?.trim() || c.name,
      score: 0,
      streak: 0,
    }));
    setTeams(ts);
    setWordIdx(Math.floor(Math.random() * WORDS.length));
    setCurrent(0);
    setRound(1);
    setPhase('play');
  };

  const nextWord = () => setWordIdx((i) => (i + 1) % WORDS.length);

  const judge = (correct: boolean) => {
    setTeams((ts) =>
      ts.map((t, i) => {
        if (i !== current) return t;
        if (correct) {
          const bonus = t.streak >= 2 ? 1 : 0; // 3rd correct in a row → +1 bonus
          return { ...t, score: t.score + 1 + bonus, streak: t.streak + 1 };
        }
        return { ...t, streak: 0 };
      })
    );
    nextWord();
    setCurrent((c) => (c + 1) % teams.length);
    setRound((r) => r + 1);
  };

  const adjust = (i: number, delta: number) =>
    setTeams((ts) => ts.map((t, idx) => (idx === i ? { ...t, score: Math.max(0, t.score + delta) } : t)));

  if (phase === 'setup') {
    return (
      <main className="min-h-[calc(100dvh-3.5rem)] bg-[#F5F6F8] px-4 py-8 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-[#35389D] text-center mb-1">แข่งขันทีม</h1>
        <p className="text-gray-500 text-sm text-center mb-8">ตั้งค่าทีม แล้วฉายบนจอให้เด็กแข่งกัน</p>

        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <p className="font-medium text-[#35389D] mb-3">จำนวนทีม</p>
          <div className="flex gap-2">
            {[2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                onClick={() => setTeamCount(n)}
                className={`flex-1 py-3 rounded-xl font-bold text-lg ${
                  teamCount === n ? 'bg-[#35389D] text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6 space-y-2">
          {COLORS.slice(0, teamCount).map((c, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full ${c.bg}`} />
              <input
                value={names[i]}
                onChange={(e) => setNames((ns) => ns.map((n, j) => (j === i ? e.target.value : n)))}
                className="flex-1 p-2 rounded-lg border border-gray-200"
                placeholder={c.name}
              />
            </div>
          ))}
        </div>

        <button
          onClick={start}
          className="w-full py-4 rounded-2xl bg-[#35389D] text-white text-lg font-bold hover:opacity-90"
        >
          เริ่มเกม
        </button>
      </main>
    );
  }

  if (phase === 'done') {
    const ranked = [...teams].sort((a, b) => b.score - a.score);
    const top = ranked[0]?.score ?? 0;
    const winners = ranked.filter((t) => t.score === top);
    return (
      <main className="min-h-[calc(100dvh-3.5rem)] bg-[#F5F6F8] px-4 py-10 max-w-lg mx-auto text-center">
        <p className="text-gray-500">ทีมชนะ</p>
        <h1 className="text-4xl font-bold text-[#35389D] my-3">
          {winners.map((w) => w.name).join(' / ')} 🏆
        </h1>
        <ol className="bg-white rounded-2xl shadow-sm p-4 my-6 space-y-2 text-left">
          {ranked.map((t, i) => (
            <li key={i} className="flex items-center gap-3 px-2 py-2">
              <span className={`w-6 h-6 rounded-full ${t.bg}`} />
              <span className="flex-1 font-medium">{t.name}</span>
              <span className="font-bold text-[#35389D]">{t.score} คะแนน</span>
            </li>
          ))}
        </ol>
        <button
          onClick={start}
          className="w-full py-4 rounded-2xl bg-[#35389D] text-white text-lg font-bold hover:opacity-90 inline-flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-5 h-5" /> เล่นใหม่
        </button>
      </main>
    );
  }

  // play
  const word = WORDS[wordIdx];
  const cur = teams[current];

  return (
    <main className="h-[100dvh] overflow-hidden bg-[#F5F6F8] flex flex-col">
      {/* team scoreboards */}
      <div className="grid gap-2 p-3 shrink-0" style={{ gridTemplateColumns: `repeat(${teams.length}, minmax(0, 1fr))` }}>
        {teams.map((t, i) => {
          const isCur = i === current;
          return (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-2xl p-3 text-white transition ${t.bg} ${isCur ? 'ring-4 ring-offset-2 scale-[1.03]' : 'opacity-90'}`}
            >
              <p className="text-xs font-medium truncate">{t.name}{isCur ? ' • ตาม Turns' : ''}</p>
              <p className="text-4xl font-bold leading-tight">{t.score}</p>
              <p className="text-[11px] h-4">{t.streak >= 2 ? `🔥 x${t.streak}` : ''}</p>
            </button>
          );
        })}
      </div>

      {/* big word (kid reads this) */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-4">
        <p className="text-7xl md:text-8xl font-bold text-center text-[#35389D] leading-tight">
          <ColoredWord text={word} />
        </p>
        <p className="text-gray-400 text-sm mt-4">รอบที่ {round} • เชิญ {cur?.name} อ่าน</p>
      </div>

      {/* facilitator controls */}
      <div className="shrink-0 p-3 max-w-3xl mx-auto w-full">
        <div className="flex gap-3">
          <button
            onClick={() => judge(true)}
            className="flex-1 py-5 rounded-2xl bg-green-500 text-white text-2xl font-bold hover:bg-green-600 flex items-center justify-center gap-2"
          >
            <Check className="w-7 h-7" /> ถูก
          </button>
          <button
            onClick={() => judge(false)}
            className="flex-1 py-5 rounded-2xl bg-red-500 text-white text-2xl font-bold hover:bg-red-600 flex items-center justify-center gap-2"
          >
            <X className="w-7 h-7" /> ผิด
          </button>
        </div>
        <div className="flex gap-3 mt-2">
          <button
            onClick={nextWord}
            className="flex-1 py-3 rounded-2xl bg-gray-800 text-white font-medium hover:opacity-90 flex items-center justify-center gap-2"
          >
            <Forward className="w-5 h-5" /> คำใหม่
          </button>
          <button
            onClick={() => adjust(current, -1)}
            className="px-5 py-3 rounded-2xl bg-gray-200 text-gray-600 font-medium hover:bg-gray-300"
          >
            −1
          </button>
          <button
            onClick={() => setPhase('done')}
            className="px-5 py-3 rounded-2xl bg-gray-200 text-gray-600 font-medium hover:bg-gray-300 flex items-center gap-1"
          >
            <Flag className="w-4 h-4" /> จบ
          </button>
        </div>
      </div>
    </main>
  );
}
