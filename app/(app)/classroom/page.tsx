'use client';

import { useState, useEffect } from 'react';
import { Check, X, Shuffle, Flag, RotateCcw, SkipForward } from 'lucide-react';
import { ColoredWord } from '@/components/ColoredWord';

/**
 * Projector team-game (classroom, teacher-facilitated, teacher-judged).
 * One screen, N teams, you drive. Octalysis drives 2/5/6/8.
 *
 * Base modes (turn structure):
 *  - turn     : fixed turn order; correct or wrong, turn passes to next team.
 *  - survival : a team keeps the turn while correct; a miss passes it.
 *  - race     : no turn order; first team you see read it right gets the point.
 *  - duel     : king-of-the-hill — champ vs challenger; winner stays.
 * Layers:
 *  - steal      : on a miss, any team can steal the point before it passes.
 *  - bonusEvery : every Nth round is a SENTENCE worth 2× (a bonus round).
 * Word bank comes from /api/words (curated 739, with ครูกาญ segments).
 */

const COLORS = [
  { name: 'ทีมแดง', bg: 'bg-red-500', text: 'text-red-600' },
  { name: 'ทีมน้ำเงิน', bg: 'bg-blue-500', text: 'text-blue-600' },
  { name: 'ทีมเขียว', bg: 'bg-emerald-500', text: 'text-emerald-600' },
  { name: 'ทีมเหลือง', bg: 'bg-amber-500', text: 'text-amber-600' },
  { name: 'ทีมม่วง', bg: 'bg-purple-500', text: 'text-purple-600' },
  { name: 'ทีมส้ม', bg: 'bg-orange-500', text: 'text-orange-600' },
];

const SENTENCES = [
  'แม่ทำกับข้าว', 'นกบินกลับรัง', 'พ่ออ่านหนังสือ', 'ฝนตกทั่วฟ้า',
  'แมวนอนหลับ', 'เด็กเล่นกีฬา', 'ปู่เลี้ยงควาย', 'ฉันรักครู',
];

const LOCAL_WORDS = [
  'ม้า', 'นก', 'น้ำ', 'บ้าน', 'ตา', 'ปลา', 'ไก่', 'หมา', 'รถ', 'ต้นไม้',
  'ข้าว', 'หนังสือ', 'ดินสอ', 'ปากกา', 'ว่าว', 'ลม', 'ฝน', 'ดาว', 'ครู', 'เพื่อน',
  'กบ', 'เป็ด', 'วัว', 'ควาย', 'มด', 'ผึ้ง', 'เสือ', 'ช้าง', 'กระต่าย', 'ปลาโลมา',
];

type Mode = 'turn' | 'survival' | 'race' | 'duel';

interface Team {
  name: string;
  bg: string;
  text: string;
  score: number;
  streak: number;
}
interface Item {
  text: string;
  segments?: { char: string; color: string }[] | null;
  isSentence: boolean;
}

const MODES: { id: Mode; label: string; desc: string }[] = [
  { id: 'turn', label: 'เวียนทีม', desc: 'ทีมเวียนกันอ่าน ครบรอบ' },
  { id: 'survival', label: 'เก็บต่อ', desc: 'อ่านถูกได้อ่านต่อ ผิดเปลี่ยนทีม' },
  { id: 'race', label: 'แข่งความเร็ว', desc: 'ทีมไหนอ่านได้ก่อน แตะทีมนั้น' },
  { id: 'duel', label: 'ดวลตัวต่อตัว', desc: 'แชมป์ vs ผู้ท้าชิง ผู้ชนะอยู่ต่อ' },
];

export default function ClassroomGamePage() {
  const [phase, setPhase] = useState<'setup' | 'play' | 'done'>('setup');

  // setup
  const [teamCount, setTeamCount] = useState(4);
  const [names, setNames] = useState<string[]>(COLORS.map((c) => c.name));
  const [mode, setMode] = useState<Mode>('turn');
  const [steal, setSteal] = useState(false);
  const [bonusEvery, setBonusEvery] = useState(5);

  // pool
  const [wordPool, setWordPool] = useState<{ text: string; segments?: { char: string; color: string }[] | null }[]>([]);

  // play
  const [teams, setTeams] = useState<Team[]>([]);
  const [current, setCurrent] = useState(0);
  const [round, setRound] = useState(1);
  const [stealOpen, setStealOpen] = useState(false);
  const [item, setItem] = useState<Item>({ text: '', isSentence: false });

  useEffect(() => {
    fetch('/api/words')
      .then((r) => r.json())
      .then((d) => {
        const ws = (d.words ?? []) as { text: string; segments?: { char: string; color: string }[] | null }[];
        if (ws.length) setWordPool(ws);
      })
      .catch(() => {});
  }, []);

  const pickItem = (r: number): Item => {
    if (bonusEvery > 0 && r % bonusEvery === 0) {
      return { text: SENTENCES[r % SENTENCES.length], isSentence: true };
    }
    const pool: { text: string; segments?: { char: string; color: string }[] | null }[] = wordPool.length
      ? wordPool
      : LOCAL_WORDS.map((text) => ({ text }));
    const w = pool[Math.floor(Math.random() * pool.length)];
    return { text: w.text, segments: w.segments ?? null, isSentence: false };
  };

  const start = () => {
    setTeams(
      COLORS.slice(0, teamCount).map((c, i) => ({
        ...c,
        name: names[i]?.trim() || c.name,
        score: 0,
        streak: 0,
      }))
    );
    setCurrent(0);
    setRound(1);
    setStealOpen(false);
    setItem(pickItem(1));
    setPhase('play');
  };

  const n = teams.length;
  const isBonusRound = bonusEvery > 0 && round % bonusEvery === 0;
  const challenger = (current + 1) % n;

  const advance = (winnerIdx: number | null) => {
    setCurrent((c) => {
      if (mode === 'turn') return (c + 1) % n;
      if (mode === 'survival') return winnerIdx === c ? c : (c + 1) % n;
      if (mode === 'duel') return winnerIdx !== null ? winnerIdx : c;
      return c;
    });
    setRound((r) => r + 1);
    setStealOpen(false);
    setItem(pickItem(round + 1));
  };

  const award = (i: number) => {
    const t = teams[i];
    const streakBonus = t.streak >= 2 ? 1 : 0;
    const mult = isBonusRound ? 2 : 1;
    const pts = (1 + streakBonus) * mult;
    setTeams((ts) => ts.map((x, idx) => (idx === i ? { ...x, score: x.score + pts, streak: x.streak + 1 } : x)));
    advance(i);
  };

  const miss = () => {
    setTeams((ts) => ts.map((x, idx) => (idx === current ? { ...x, streak: 0 } : x)));
    if (steal && (mode === 'turn' || mode === 'survival') && !stealOpen) {
      setStealOpen(true);
      return;
    }
    advance(null);
  };

  const skip = () => {
    setStealOpen(false);
    advance(null);
  };

  const reroll = () => setItem(pickItem(round));
  const adjust = (i: number, d: number) =>
    setTeams((ts) => ts.map((t, idx) => (idx === i ? { ...t, score: Math.max(0, t.score + d) } : t)));

  // which teams are tappable right now
  const tappable = (i: number): boolean => {
    if (stealOpen) return true;
    if (mode === 'race') return true;
    if (mode === 'duel') return i === current || i === challenger;
    return i === current; // turn / survival
  };

  // ---- SETUP ----
  if (phase === 'setup') {
    return (
      <main className="min-h-[calc(100dvh-3.5rem)] bg-[#F5F6F8] px-4 py-8 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-[#35389D] text-center mb-1">แข่งขันทีม</h1>
        <p className="text-gray-500 text-sm text-center mb-6">ตั้งค่าทีม ฉายบนจอ แล้วแข่งกัน</p>

        <div className="bg-white rounded-2xl shadow-sm p-4 mb-3">
          <p className="font-medium text-[#35389D] mb-3 text-sm">รูปแบบเกม</p>
          <div className="grid grid-cols-2 gap-2">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`p-3 rounded-xl text-left ${mode === m.id ? 'bg-[#35389D] text-white' : 'bg-gray-100'}`}
              >
                <p className="font-bold text-sm">{m.label}</p>
                <p className={`text-[11px] ${mode === m.id ? 'text-white/80' : 'text-gray-500'}`}>{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 mb-3">
          <p className="font-medium text-[#35389D] mb-3 text-sm">จำนวนทีม</p>
          <div className="flex gap-2">
            {[2, 3, 4, 5, 6].map((k) => (
              <button
                key={k}
                onClick={() => setTeamCount(k)}
                className={`flex-1 py-2.5 rounded-xl font-bold ${teamCount === k ? 'bg-[#35389D] text-white' : 'bg-gray-100 text-gray-500'}`}
              >
                {k}
              </button>
            ))}
          </div>
          <div className="space-y-2 mt-3">
            {COLORS.slice(0, teamCount).map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full ${c.bg}`} />
                <input
                  value={names[i]}
                  onChange={(e) => setNames((ns) => ns.map((x, j) => (j === i ? e.target.value : x)))}
                  className="flex-1 p-1.5 rounded-lg border border-gray-200 text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 space-y-3">
          <label className="flex items-center justify-between text-sm">
            <span>ขโมยคะแนน (ผิดแล้วเปิดให้ขโมยได้)</span>
            <input type="checkbox" checked={steal} onChange={(e) => setSteal(e.target.checked)} className="w-5 h-5" />
          </label>
          <label className="flex items-center justify-between text-sm">
            <span>รอบโบนัส (ประโยค ×2) ทุก ๆ</span>
            <select value={bonusEvery} onChange={(e) => setBonusEvery(Number(e.target.value))} className="p-1.5 rounded-lg border border-gray-200">
              <option value={0}>ปิด</option>
              <option value={3}>3 รอบ</option>
              <option value={5}>5 รอบ</option>
              <option value={7}>7 รอบ</option>
            </select>
          </label>
        </div>

        <button onClick={start} className="w-full py-4 rounded-2xl bg-[#35389D] text-white text-lg font-bold hover:opacity-90">
          เริ่มเกม
        </button>
      </main>
    );
  }

  // ---- DONE ----
  if (phase === 'done') {
    const ranked = [...teams].sort((a, b) => b.score - a.score);
    const top = ranked[0]?.score ?? 0;
    const winners = ranked.filter((t) => t.score === top);
    return (
      <main className="min-h-[calc(100dvh-3.5rem)] bg-[#F5F6F8] px-4 py-10 max-w-lg mx-auto text-center">
        <p className="text-gray-500">ทีมชนะ</p>
        <h1 className="text-4xl font-bold text-[#35389D] my-3">{winners.map((w) => w.name).join(' / ')} 🏆</h1>
        <ol className="bg-white rounded-2xl shadow-sm p-4 my-6 space-y-2 text-left">
          {ranked.map((t, i) => (
            <li key={i} className="flex items-center gap-3 px-2 py-2">
              <span className={`w-6 h-6 rounded-full ${t.bg}`} />
              <span className="flex-1 font-medium">{t.name}</span>
              <span className="font-bold text-[#35389D]">{t.score}</span>
            </li>
          ))}
        </ol>
        <button onClick={start} className="w-full py-4 rounded-2xl bg-[#35389D] text-white text-lg font-bold inline-flex items-center justify-center gap-2">
          <RotateCcw className="w-5 h-5" /> เล่นใหม่
        </button>
      </main>
    );
  }

  // ---- PLAY ----
  const prompt =
    mode === 'duel'
      ? `${teams[current]?.name} vs ${teams[challenger]?.name}`
      : mode === 'race'
      ? 'ทีมไหนอ่านได้ก่อน — แตะทีมนั้น'
      : stealOpen
      ? 'เปิดขโมย! แตะทีมที่จะขโมย'
      : `เชิญ ${teams[current]?.name} อ่าน`;

  return (
    <main className="h-[100dvh] overflow-hidden bg-[#F5F6F8] flex flex-col">
      <div className="grid gap-2 p-3 shrink-0" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {teams.map((t, i) => {
          const active = mode === 'turn' || mode === 'survival' ? i === current : mode === 'duel' ? i === current || i === challenger : true;
          const canTap = tappable(i);
          return (
            <button
              key={i}
              onClick={() => canTap && award(i)}
              disabled={!canTap}
              className={`rounded-2xl p-3 text-white transition ${t.bg} ${
                active ? 'ring-4 ring-offset-2 scale-[1.03]' : ''
              } ${canTap ? 'hover:opacity-90 cursor-pointer' : 'opacity-50 cursor-default'}`}
            >
              <p className="text-xs font-medium truncate">{t.name}</p>
              <p className="text-4xl font-bold leading-tight">{t.score}</p>
              <p className="text-[11px] h-4">{t.streak >= 2 ? `🔥 x${t.streak}` : ''}</p>
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-4">
        {isBonusRound && (
          <span className="mb-3 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">⭐ รอบโบนัส ×2 — ประโยค</span>
        )}
        <p className={`font-bold text-center text-[#35389D] leading-tight ${item.isSentence ? 'text-5xl md:text-6xl' : 'text-7xl md:text-8xl'}`}>
          <ColoredWord text={item.text} segments={item.segments ?? undefined} />
        </p>
        <p className="text-gray-400 text-sm mt-4">รอบที่ {round} • {prompt}</p>
      </div>

      <div className="shrink-0 p-3 max-w-3xl mx-auto w-full">
        {!stealOpen && mode !== 'race' && (
          <div className="flex gap-3 mb-2">
            <button onClick={() => award(current)} className="flex-1 py-5 rounded-2xl bg-green-500 text-white text-2xl font-bold hover:bg-green-600 flex items-center justify-center gap-2">
              <Check className="w-7 h-7" /> ถูก
            </button>
            <button onClick={miss} className="flex-1 py-5 rounded-2xl bg-red-500 text-white text-2xl font-bold hover:bg-red-600 flex items-center justify-center gap-2">
              <X className="w-7 h-7" /> ผิด
            </button>
          </div>
        )}
        <div className="flex gap-3">
          {stealOpen ? (
            <button onClick={skip} className="flex-1 py-4 rounded-2xl bg-gray-800 text-white font-medium flex items-center justify-center gap-2">
              <SkipForward className="w-5 h-5" /> ไม่มีใครขโมย
            </button>
          ) : mode === 'race' ? (
            <button onClick={skip} className="flex-1 py-4 rounded-2xl bg-gray-800 text-white font-medium flex items-center justify-center gap-2">
              <SkipForward className="w-5 h-5" /> ไม่มีใครได้
            </button>
          ) : null}
          <button onClick={reroll} className="px-5 py-3 rounded-2xl bg-gray-200 text-gray-600 font-medium hover:bg-gray-300 flex items-center gap-1">
            <Shuffle className="w-4 h-4" /> คำใหม่
          </button>
          <button onClick={() => adjust(current, -1)} className="px-4 py-3 rounded-2xl bg-gray-200 text-gray-600 font-medium hover:bg-gray-300">−1</button>
          <button onClick={() => setPhase('done')} className="px-4 py-3 rounded-2xl bg-gray-200 text-gray-600 font-medium hover:bg-gray-300 flex items-center gap-1">
            <Flag className="w-4 h-4" /> จบ
          </button>
        </div>
      </div>
    </main>
  );
}
