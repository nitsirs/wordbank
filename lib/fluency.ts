/**
 * Fluency engine for /practice/p1 (production mode).
 *
 * The selector is the keybr fluency model — fluency(unit) = accuracy + speed +
 * recency — NOT an FSRS due-date. FSRS is demoted to an optional ทวน tail
 * (services/db.ts still advances the card as a side input). pickNext targets the
 * GraphoGame "optimally challenging" zone: a word whose predicted success is
 * ~80%, weighted toward the weak/acquiring band with a small steady drip of
 * brand-new words.
 *
 * Pure functions — no Supabase, no DOM. Unit-testable. All knobs in FLUENCY.
 */

export interface FluencyStats {
  reps: number;
  /** Fraction correct over the last N production grades (0..1). null = unseen. */
  recentAccuracy: number | null;
  /** Mean seconds-per-grade over the last N production grades. null = unseen. */
  avgSpeed: number | null;
  /** Epoch ms of the most recent production grade. null = unseen. */
  lastReviewMs: number | null;
}

export interface FluencyWord {
  id: number;
  text: string;
  segments?: { char: string; color: string }[] | null;
  stats: FluencyStats;
}

/** Tunable constants. Tweak here; everything else derives. */
export const FLUENCY = {
  // predicted-success weights (sum to 1)
  ACCURACY_WEIGHT: 0.6,
  SPEED_WEIGHT: 0.25,
  RECENCY_WEIGHT: 0.15,
  // speed mapping: <= FAST sec → full credit, >= SLOW sec → none (linear between)
  SPEED_FAST_SEC: 2,
  SPEED_SLOW_SEC: 8,
  // recency half-life: a word fades toward "needs another rep" over this window
  RECENCY_HALF_LIFE_MS: 2 * 24 * 60 * 60 * 1000, // 2 days
  // selection target + falloff (Gaussian, asymmetric: gentle below, sharp above)
  TARGET_SUCCESS: 0.8,
  SIGMA_BELOW: 0.3,
  SIGMA_ABOVE: 0.12,
  // fraction of picks that introduce a brand-new (unseen) word
  UNSEEN_INTRO_RATE: 0.15,
} as const;

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

/** True when the student has no production history for this word. */
export function isUnseen(s: FluencyStats): boolean {
  return s.recentAccuracy === null;
}

/**
 * Predicted probability the student reads this word correctly right now — the
 * keybr fluency composite. Returns 0 for unseen words (they sit below target and
 * enter the drill via the unseen-introduction drip, not the target weighting).
 */
export function fluencyScore(s: FluencyStats, nowMs: number = Date.now()): number {
  if (isUnseen(s)) return 0;

  const accuracy = clamp01(s.recentAccuracy ?? 0);

  const speed =
    s.avgSpeed == null
      ? 0
      : clamp01(
          (FLUENCY.SPEED_SLOW_SEC - s.avgSpeed) /
            (FLUENCY.SPEED_SLOW_SEC - FLUENCY.SPEED_FAST_SEC)
        );

  const recency =
    s.lastReviewMs == null
      ? 0
      : Math.pow(0.5, (nowMs - s.lastReviewMs) / FLUENCY.RECENCY_HALF_LIFE_MS);

  return clamp01(
    FLUENCY.ACCURACY_WEIGHT * accuracy +
      FLUENCY.SPEED_WEIGHT * speed +
      FLUENCY.RECENCY_WEIGHT * recency
  );
}

/**
 * Selection weight for a word of predicted success p — Gaussian peaked at the
 * ~80% target. Wider below (rescue failing words), narrower above (retire
 * mastered words). Never negative.
 */
export function selectionWeight(p: number): number {
  const t = FLUENCY.TARGET_SUCCESS;
  const sigma = p <= t ? FLUENCY.SIGMA_BELOW : FLUENCY.SIGMA_ABOVE;
  return Math.exp(-((p - t) ** 2) / (2 * sigma * sigma));
}

export interface PickOptions {
  /** Override FLUENCY.UNSEEN_INTRO_RATE for this pick. */
  unseenIntroRate?: number;
  /** Exclude a word id (e.g. the currently-shown word) so it isn't repeated. */
  excludeId?: number | null;
  /** Injectable RNG for tests; defaults to Math.random. */
  rand?: () => number;
}

/**
 * Choose the next word to drill. ~85% of the time it weight-picks a seen word
 * toward the 80% target; ~15% it introduces an unseen word (acquisition drip).
 * Falls back to unseen uniformly when the student has no healthy seen words yet.
 */
export function pickNext(
  words: FluencyWord[],
  opts: PickOptions = {}
): FluencyWord | null {
  if (!words.length) return null;
  const rand = opts.rand ?? Math.random;

  const pool =
    opts.excludeId == null ? words : words.filter((w) => w.id !== opts.excludeId);
  if (!pool.length) return words[0];

  const unseen = pool.filter((w) => isUnseen(w.stats));
  const seen = pool.filter((w) => !isUnseen(w.stats));

  const introRate = opts.unseenIntroRate ?? FLUENCY.UNSEEN_INTRO_RATE;
  if (unseen.length && rand() < introRate) {
    return unseen[Math.floor(rand() * unseen.length)];
  }

  const candidates = seen.length ? seen : unseen;
  if (!candidates.length) return pool[0];

  const weights = candidates.map((w) => selectionWeight(fluencyScore(w.stats)));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return candidates[Math.floor(rand() * candidates.length)];

  let r = rand() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}
