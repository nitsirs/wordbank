/**
 * Gamification engine — Octalysis drives 2 (Development & Accomplishment),
 * 4 (Ownership), 6 (Scarcity/impatience — daily streak), 8 (Loss — streak-saver).
 * Pure functions; no Date() at module scope (currentStreak takes a Date factory
 * so it's testable + safe server-side when not used).
 */

export const XP = {
  CORRECT: 12,
  ATTEMPT: 3,
} as const;

// Level curve (cumulative XP). Thai kid-facing titles.
export interface LevelDef {
  lvl: number;
  title: string;
  xp: number;
}
export const LEVELS: LevelDef[] = [
  { lvl: 1, title: 'นักอ่านฝึกหัด', xp: 0 },
  { lvl: 2, title: 'นักอ่านน้อย', xp: 120 },
  { lvl: 3, title: 'นักอ่านหัวใจสู้', xp: 360 },
  { lvl: 4, title: 'นักอ่านมือทอง', xp: 800 },
  { lvl: 5, title: 'นักอ่านระดับเซียน', xp: 1600 },
  { lvl: 6, title: 'ปรมาจารย์บัญชีคำ', xp: 3200 },
];

export interface LevelInfo {
  level: LevelDef;
  next: LevelDef | null;
  /** Progress 0..1 toward next level (1 if maxed). */
  progress: number;
  /** XP into the current level band. */
  xpInto: number;
  /** XP needed to reach next level from current band start. */
  xpSpan: number;
}

export function levelFromXp(xp: number): LevelInfo {
  let cur = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.xp) cur = l;
  const next = LEVELS.find((l) => l.xp > xp) ?? null;
  if (!next) return { level: cur, next: null, progress: 1, xpInto: xp - cur.xp, xpSpan: 1 };
  const span = next.xp - cur.xp;
  const into = xp - cur.xp;
  return { level: cur, next, progress: Math.max(0, Math.min(1, into / span)), xpInto: into, xpSpan: span };
}

export interface GamifyStats {
  reviews: number;
  correct: number;
  distinctWords: number;
  bestStreak: number;
  currentStreak: number;
}

export function xpFromStats(s: Pick<GamifyStats, 'reviews' | 'correct'>): number {
  return s.correct * XP.CORRECT + Math.max(0, s.reviews - s.correct) * XP.ATTEMPT;
}

const fmtDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Current consecutive-day streak. daysActive = ['YYYY-MM-DD', ...] with ≥1 review. */
export function currentStreak(daysActive: string[], now: Date = new Date()): number {
  const set = new Set(daysActive);
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!set.has(fmtDay(d))) d.setDate(d.getDate() - 1); // grace: today not yet active
  let streak = 0;
  while (set.has(fmtDay(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/** Longest consecutive-day streak across the active-days list. */
export function bestStreak(daysActive: string[]): number {
  if (!daysActive.length) return 0;
  const sorted = [...daysActive].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T00:00:00');
    const cur = new Date(sorted[i] + 'T00:00:00');
    const diff = Math.round((cur.getTime() - prev.getTime()) / 86400000);
    run = diff === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

export interface Badge {
  id: string;
  emoji: string;
  label: string;
  earned: boolean;
}

export function badges(s: GamifyStats): Badge[] {
  const acc = s.reviews > 0 ? s.correct / s.reviews : 0;
  return [
    { id: 'first', emoji: '🌱', label: 'อ่านคำแรก', earned: s.reviews >= 1 },
    { id: 'w10', emoji: '📚', label: 'รู้จัก 10 คำ', earned: s.distinctWords >= 10 },
    { id: 'w50', emoji: '🌟', label: 'รู้จัก 50 คำ', earned: s.distinctWords >= 50 },
    { id: 'w100', emoji: '💯', label: 'รู้จัก 100 คำ', earned: s.distinctWords >= 100 },
    { id: 's3', emoji: '🔥', label: 'ซ้อม 3 วันติด', earned: s.bestStreak >= 3 },
    { id: 's7', emoji: '⚡', label: 'ซ้อม 7 วันติด', earned: s.bestStreak >= 7 },
    { id: 'acc80', emoji: '🎯', label: 'แม่นยำ 80%', earned: s.reviews >= 20 && acc >= 0.8 },
  ];
}
