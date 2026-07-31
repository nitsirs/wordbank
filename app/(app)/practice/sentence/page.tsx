'use client';

import { useEffect, useState, useRef } from 'react';
import { Mic, Square, ArrowRight } from 'lucide-react';
import { startRecorder, blobToBase64, type Recorder } from '@/lib/recordWav';
import { GRADE_LABEL } from '@/lib/scoreRubric';

// Demo sentence set (simple, ป.1-appropriate). TODO: replace with the official RT
// 10-sentence bank / a seeded sentence table for real practice.
const SENTENCES = [
  'แม่ทำกับข้าว',
  'ปู่เลี้ยงควาย',
  'นกบินกลับรัง',
  'ฝนตกทั่วฟ้า',
  'พ่ออ่านหนังสือ',
  'แมวนอนหลับ',
  'เด็กเล่นกีฬา',
  'ฉันรักครู',
];

interface ScoreResult {
  grade: 0 | 1 | 2 | 3;
  pron: number;
  accuracy: number;
  fluency: number;
  completeness: number;
  recognizedText: string;
  words: { word: string; accuracy: number; errorType: string }[];
}

export default function SentencePracticePage() {
  const [idx, setIdx] = useState(0);
  const [recording, setRecording] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const recRef = useRef<Recorder | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('username')) {
      window.location.href = '/';
    }
  }, []);

  const sentence = SENTENCES[idx];

  const startRec = async () => {
    setErr(null);
    setResult(null);
    try {
      recRef.current = await startRecorder(16000, {
        onAutoStop: (reason) => {
          if (reason === 'timeout') {
            cancelRec('ไม่ได้ยินเสียง ลองกดพูดแล้วอ่านออกเสียงดัง ๆ อีกครั้งนะ');
          } else {
            stopRec();
          }
        },
      });
      setRecording(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'ไม่สามารถเปิดไมโครโฟนได้');
    }
  };

  // No speech detected at all — stop the mic, don't waste a scoring call, let the child retry.
  const cancelRec = async (message: string) => {
    if (!recRef.current) return;
    setRecording(false);
    await recRef.current.stop();
    recRef.current = null;
    setErr(message);
  };

  const stopRec = async () => {
    if (!recRef.current) return;
    setRecording(false);
    setScoring(true);
    try {
      const blob = await recRef.current.stop();
      recRef.current = null;
      const audio = await blobToBase64(blob);
      const r = await fetch('/api/score-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio, reference: sentence }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || 'score failed');
      setResult(json);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setScoring(false);
    }
  };

  const next = () => {
    setResult(null);
    setErr(null);
    setIdx((i) => (i + 1) % SENTENCES.length);
  };

  return (
    <main className="min-h-[calc(100dvh-3.5rem)] bg-[#F5F6F8] flex flex-col items-center px-4 py-8">
      <h1 className="text-xl font-bold text-[#35389D] mb-1">ฝึกอ่านประโยค</h1>
      <p className="text-gray-500 text-sm mb-8">
        {recording ? 'อ่านออกเสียงดัง ๆ ได้เลย ระบบจะตรวจให้เองเมื่ออ่านจบ' : 'กดอ่าน แล้วอ่านประโยคให้ดัง ๆ'}
      </p>

      <div className="bg-white rounded-3xl shadow-sm px-6 py-12 w-full max-w-xl text-center mb-8">
        <p className="text-4xl font-bold text-[#35389D] leading-snug">{sentence}</p>
      </div>

      {!result && (
        <button
          onClick={recording ? stopRec : startRec}
          disabled={scoring}
          className={`flex items-center gap-2 px-8 py-4 rounded-2xl text-white text-lg font-medium ${
            recording ? 'bg-red-500 hover:bg-red-600' : 'bg-[#35389D] hover:opacity-90'
          } disabled:opacity-50`}
        >
          {scoring ? (
            '…กำลังตรวจ'
          ) : recording ? (
            <>
              <Square className="w-5 h-5 animate-pulse" /> กำลังฟัง… (กดเพื่อหยุดเอง)
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" /> อ่าน
            </>
          )}
        </button>
      )}

      {err && <p className="text-red-500 text-sm mt-4">{err}</p>}

      {result && (
        <div className="w-full max-w-xl bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-lg font-bold text-[#35389D]">{GRADE_LABEL[result.grade]}</span>
            <span className="text-3xl font-bold text-[#35389D]">{result.pron.toFixed(0)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs text-gray-600 mb-4">
            <div className="bg-gray-50 rounded-lg py-2">
              <p className="font-bold text-[#35389D]">{result.accuracy.toFixed(0)}</p>เที่ยงตรง
            </div>
            <div className="bg-gray-50 rounded-lg py-2">
              <p className="font-bold text-[#35389D]">{result.fluency.toFixed(0)}</p>คล่อง
            </div>
            <div className="bg-gray-50 rounded-lg py-2">
              <p className="font-bold text-[#35389D]">{result.completeness.toFixed(0)}</p>ครบ
            </div>
          </div>
          <p className="text-sm text-gray-400 mb-1">ได้ยิน: {result.recognizedText || '—'}</p>
          <div className="flex flex-wrap gap-1">
            {result.words.map((w, i) => (
              <span
                key={i}
                className={`text-sm px-2 py-0.5 rounded ${
                  w.errorType === 'None' || w.errorType === 'None.'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-600'
                }`}
                title={`${w.errorType} (${w.accuracy})`}
              >
                {w.word}
              </span>
            ))}
          </div>
          <button
            onClick={next}
            className="mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#35389D] text-white font-medium hover:opacity-90"
          >
            ประโยคต่อไป <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </main>
  );
}
