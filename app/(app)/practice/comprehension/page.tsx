'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, X, RotateCcw } from 'lucide-react';
import { COMPREHENSION_ITEMS, type CompItem } from '@/lib/comprehensionItems';

// ฝึกอ่านรู้เรื่อง — real RT ป.1 past-paper MC items (ข้อสอบจริง). 3-choice,
// immediate feedback, score tally. Mirrors the exam's ตอน ๒/๓ MC format.
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ComprehensionPage() {
  const [order, setOrder] = useState<CompItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('username')) {
      window.location.href = '/';
      return;
    }
    setOrder(shuffle(COMPREHENSION_ITEMS));
  }, []);

  const item = order[idx];
  const total = order.length;

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === item.answer) setScore((s) => s + 1);
  };

  const next = () => {
    if (idx + 1 >= total) {
      setDone(true);
    } else {
      setIdx((i) => i + 1);
      setPicked(null);
    }
  };

  const restart = () => {
    setOrder(shuffle(COMPREHENSION_ITEMS));
    setIdx(0);
    setPicked(null);
    setScore(0);
    setDone(false);
  };

  const body = useMemo(() => {
    if (!order.length) return null;
    if (done) {
      return (
        <div className="text-center">
          <p className="text-gray-500">จบแล้ว!</p>
          <h1 className="text-5xl font-bold text-[#35389D] my-3">
            {score}/{total}
          </h1>
          <p className="text-gray-500 mb-6">ถูก {score} จาก {total} ข้อ</p>
          <button onClick={restart} className="px-6 py-3 rounded-2xl bg-[#35389D] text-white font-medium inline-flex items-center gap-2">
            <RotateCcw className="w-5 h-5" /> ฝึกใหม่
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

        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <span className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-[#35389D]/10 text-[#35389D] mb-3">
            {item.type === 'poem' ? 'บทร้อยกรอง' : item.type === 'passage' ? 'ข้อความ' : 'ประโยค'}
          </span>
          {item.stem.map((line, i) => (
            <p key={i} className="text-xl text-gray-800 leading-relaxed">{line}</p>
          ))}
        </div>

        <p className="font-bold text-[#35389D] mb-3 text-center">{item.question}</p>

        <div className="space-y-2">
          {item.choices.map((c, i) => {
            const isAnswer = i === item.answer;
            const isPicked = i === picked;
            let cls = 'bg-white hover:bg-gray-50';
            if (picked !== null) {
              if (isAnswer) cls = 'bg-green-50 border-green-400 text-green-700';
              else if (isPicked) cls = 'bg-red-50 border-red-300 text-red-600';
              else cls = 'bg-white opacity-60';
            }
            return (
              <button
                key={i}
                onClick={() => pick(i)}
                disabled={picked !== null}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 border-transparent ${cls} transition flex items-center gap-3`}
              >
                <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1 text-lg">{c}</span>
                {picked !== null && isAnswer && <Check className="w-5 h-5 text-green-600" />}
                {picked !== null && isPicked && !isAnswer && <X className="w-5 h-5 text-red-500" />}
              </button>
            );
          })}
        </div>

        {picked !== null && (
          <div className="mt-4">
            <p className="text-xs text-gray-400 text-center mb-3">ตัวชี้วัด: {item.indicator} · ข้อสอบ RT ปี {item.year}</p>
            <button onClick={next} className="w-full py-3 rounded-2xl bg-[#35389D] text-white font-medium">
              {idx + 1 >= total ? 'ดูคะแนน' : 'ข้อถัดไป'}
            </button>
          </div>
        )}
      </>
    );
  }, [order, idx, picked, score, done, total, item]);

  return (
    <main className="min-h-[calc(100dvh-3.5rem)] bg-[#F5F6F8] px-4 py-6 max-w-xl mx-auto">
      <h1 className="text-xl font-bold text-[#35389D] text-center mb-1">ฝึกอ่านรู้เรื่อง</h1>
      <p className="text-gray-500 text-sm text-center mb-6">ข้อสอบจริงจากแบบทดสอบ RT ป.1</p>
      {body ?? <p className="text-center text-gray-400">กำลังโหลด…</p>}
    </main>
  );
}
