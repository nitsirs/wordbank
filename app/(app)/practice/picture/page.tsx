'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { submitItemReview } from '@/services/db';

// ฝึกภาพ-คำ (ตอน ๑ ของ RT: จับคู่ภาพกับคำ). See a picture, pick the matching word.
// Images are AI-generated flashcards (gpt-image-1-mini) for the exam's picture-vocab.
const PICTURE_WORDS: { word: string; img: string }[] = [
  { word: 'มะม่วง', img: 'mango' },
  { word: 'ภูเขา', img: 'mountain' },
  { word: 'กระเป๋า', img: 'bag' },
  { word: 'นางฟ้า', img: 'fairy' },
  { word: 'มะละกอ', img: 'papaya' },
  { word: 'ดอกไม้', img: 'flower' },
  { word: 'เสือดาว', img: 'leopard' },
  { word: 'ลูกแมว', img: 'kitten' },
  { word: 'ต้นไม้', img: 'tree' },
  { word: 'รถ', img: 'car' },
  { word: 'เสื้อผ้า', img: 'clothes' },
  { word: 'ห้องสมุด', img: 'library' },
];

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export default function PictureMatchPage() {
  const [order, setOrder] = useState<typeof PICTURE_WORDS>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('username')) {
      window.location.href = '/';
      return;
    }
    setOrder(shuffle(PICTURE_WORDS));
  }, []);

  const cur = order[idx];
  const total = order.length;
  const choices = useMemo(() => {
    if (!cur) return [];
    const others = PICTURE_WORDS.filter((w) => w.word !== cur.word).map((w) => w.word);
    return shuffle([cur.word, ...shuffle(others).slice(0, 2)]);
  }, [cur]);

  useEffect(() => {
    shownAt.current = Date.now();
  }, [cur]);

  const pick = (w: string) => {
    if (picked !== null) return;
    setPicked(w);
    const correct = w === cur.word;
    if (correct) setScore((s) => s + 1);
    const elapsed = (Date.now() - shownAt.current) / 1000;
    submitItemReview('picture', cur.word, correct, elapsed).catch((e) =>
      console.error('submit failed:', e),
    );
  };
  const next = () => (idx + 1 >= total ? setDone(true) : (setIdx((i) => i + 1), setPicked(null)));
  const restart = () => { setOrder(shuffle(PICTURE_WORDS)); setIdx(0); setPicked(null); setScore(0); setDone(false); };

  const body = useMemo(() => {
    if (!order.length) return null;
    if (done) {
      return (
        <div className="text-center">
          <p className="text-gray-500">จบแล้ว!</p>
          <h1 className="text-5xl font-bold text-[#35389D] my-3">{score}/{total}</h1>
          <p className="text-gray-500 mb-6">ถูก {score} จาก {total} ข้อ</p>
          <button onClick={restart} className="px-6 py-3 rounded-2xl bg-[#35389D] text-white font-medium inline-flex items-center gap-2">
            <RotateCcw className="w-5 h-5" /> เล่นใหม่
          </button>
        </div>
      );
    }
    return (
      <>
        <div className="flex items-center justify-between mb-3 text-sm text-gray-400">
          <span>ข้อที่ {idx + 1}/{total}</span>
          <span>ถูก {score}</span>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/images/comp/${cur.img}.png`} alt="ภาพ" className="w-48 h-48 object-contain" />
        </div>
        <p className="text-gray-500 text-sm text-center mb-3">ภาพนี้คือคำว่าอะไร</p>
        <div className="grid grid-cols-3 gap-2">
          {choices.map((w) => {
            const isAns = w === cur.word;
            const isPick = w === picked;
            let cls = 'bg-white hover:bg-gray-50';
            if (picked !== null) {
              if (isAns) cls = 'bg-green-50 border-green-400 text-green-700';
              else if (isPick) cls = 'bg-red-50 border-red-300 text-red-600';
              else cls = 'bg-white opacity-60';
            }
            return (
              <button key={w} onClick={() => pick(w)} disabled={picked !== null}
                className={`py-4 rounded-xl border-2 border-transparent ${cls} text-xl font-medium`}>
                {w}
              </button>
            );
          })}
        </div>
        {picked !== null && (
          <button onClick={next} className="mt-5 w-full py-3 rounded-2xl bg-[#35389D] text-white font-medium">
            {idx + 1 >= total ? 'ดูคะแนน' : 'ข้อถัดไป'}
          </button>
        )}
      </>
    );
  }, [order, idx, picked, score, done, total, cur, choices]);

  return (
    <main className="min-h-[calc(100dvh-3.5rem)] bg-[#F5F6F8] px-4 py-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold text-[#35389D] text-center mb-1">ฝึกภาพ-คำ</h1>
      <p className="text-gray-500 text-sm text-center mb-6">ดูภาพแล้วเลือกคำที่ถูกต้อง</p>
      {body ?? <p className="text-center text-gray-400">กำลังโหลด…</p>}
    </main>
  );
}
