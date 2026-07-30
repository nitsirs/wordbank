'use client';

import { useState } from "react";
import { words } from "./wordData";
import { spelling } from "./spellingData";
import { ColoredWord } from "@/components/ColoredWord";
import styles from "./p1.module.css";

const PER_PAGE = 60;

/**
 * บัญชีคำ ป.1 — แจกลูกสะกดคำ (browse mode).
 * The 739 hand-curated ป.1 words as a color-coded word wall. Tap to hear the
 * spelling-out (ออ อา อา). Uses the curated colors (ground truth) via ColoredWord,
 * the same component the FSRS quiz uses (auto-colored). No Firebase here;
 * per-student progress + the data merge come in the Supabase phase.
 */
export default function P1PracticePage() {
  const [page, setPage] = useState(0);

  const total = words.length;
  const pageCount = Math.ceil(total / PER_PAGE);
  const startIdx = page * PER_PAGE;
  const slice = words.slice(startIdx, startIdx + PER_PAGE);

  const speak = (idx: number) => {
    if (typeof window === "undefined") return;
    const text = spelling[idx] ?? words[idx].map((c) => c.char).join("");
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "th-TH";
    u.rate = 1.2;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  };

  return (
    <main className="min-h-screen bg-[#F5F6F8] p-4">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-[#35389D]">
            บัญชีคำ ป.1 — แจกลูกสะกดคำ
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            แตะคำเพื่อฟังเสียงอ่าน • {total} คำ
          </p>
        </header>

        <div className={styles.grid}>
          {slice.map((w, i) => (
            <div
              key={startIdx + i}
              className={styles.cell}
              onClick={() => speak(startIdx + i)}
              role="button"
              aria-label={`อ่านคำที่ ${startIdx + i + 1}`}
            >
              <div className={styles.card}>
                <span className={styles.index}>{startIdx + i + 1}. </span>
                <span className={styles.word}>
                  <ColoredWord segments={w} />
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.pager}>
          <button onClick={() => setPage(0)} disabled={page === 0}>
            «
          </button>
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
            ‹ ก่อนหน้า
          </button>
          <span>
            หน้า {page + 1} / {pageCount}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={page >= pageCount - 1}
          >
            ถัดไป ›
          </button>
          <button
            onClick={() => setPage(pageCount - 1)}
            disabled={page >= pageCount - 1}
          >
            »
          </button>
        </div>
      </div>
    </main>
  );
}
