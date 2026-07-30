/**
 * Thai text segmentation + word matching for the always-on ASR tick.
 *
 * Problem: Thai has no inter-word spaces, and Azure STT returns a near-spaceless
 * run, so "did the kid say THIS word" can't be a naive substring check (กา would
 * false-fire inside ก้าว / ตา inside ตาก).
 *
 * Solution: dictionary-constrained longest-match segmentation (the dictionary is
 * the known p1 word pool) → exact whole-word match. A conservative fuzzy pass on
 * the *leftover* (non-dictionary) chunks catches 1-char transcription slips
 * without reintroducing nesting false-fires (we never fuzzy-match against a
 * longer real word).
 *
 * Pure functions, no deps. Thai chars are single UTF-16 code units (BMP), so
 * standard string ops + Levenshtein work char-by-char.
 *
 * NOTE: STT *mis-hears* that are far from the target (e.g. กา → กระ, edit dist 2)
 * are NOT caught here on purpose (catching them would need a loose threshold that
 * false-fires). The robust fix for "said it right, STT mis-heard" is Pronunciation
 * Assessment scoring against the reference, not text matching — deferred.
 */

/** Normalize recognized text: strip whitespace + punctuation, keep letters/marks/digits. */
export function norm(s: string): string {
  return (s || '').replace(/[\s\p{P}]/gu, '');
}

/** Build a length-desc sorted, normalized, de-duplicated dictionary from raw words. */
export function buildDict(words: string[]): string[] {
  const set = new Set<string>();
  for (const w of words) {
    const n = norm(w);
    if (n) set.add(n);
  }
  return [...set].sort((a, b) => b.length - a.length);
}

interface Chunk {
  text: string;
  isWord: boolean; // true if matched a dictionary word
}

/**
 * Segment into chunks: maximal dictionary words vs leftover (non-dict) runs.
 * Longest-match picks ตาก over ตา when both are in the dictionary.
 */
export function segmentChunks(stream: string, dict: string[]): Chunk[] {
  const chunks: Chunk[] = [];
  let i = 0;
  let buf = '';
  const flush = () => {
    if (buf) {
      chunks.push({ text: buf, isWord: false });
      buf = '';
    }
  };
  while (i < stream.length) {
    const hit = dict.find((w) => w.length > 0 && stream.startsWith(w, i));
    if (hit) {
      flush();
      chunks.push({ text: hit, isWord: true });
      i += hit.length;
    } else {
      buf += stream[i];
      i++;
    }
  }
  flush();
  return chunks;
}

/** Convenience: just the dictionary-word tokens. */
export function segment(stream: string, dict: string[]): string[] {
  return segmentChunks(stream, dict)
    .filter((c) => c.isWord)
    .map((c) => c.text);
}

/** Character-level Levenshtein distance (rolling two rows). */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/** Conservative fuzzy threshold: 1 slip on short words, 2 on words ≥5 chars. */
function fuzzyThreshold(word: string): number {
  return word.length >= 5 ? 2 : 1;
}

export interface MatchResult {
  matched: boolean;
  via: 'exact' | 'fuzzy' | null;
}

/**
 * Does the target word appear in the recognized stream as a whole word?
 *  - exact: a dictionary-word chunk equals the target.
 *  - fuzzy: a leftover (non-dict) chunk is within the edit threshold (catches a
 *    1-char transcription slip). We never fuzzy-match against a different real
 *    dictionary word, so ตา still won't fire on ตาก.
 */
export function matchWord(stream: string, target: string, dict: string[]): MatchResult {
  const t = norm(target);
  if (!t) return { matched: false, via: null };
  const chunks = segmentChunks(norm(stream), dict);

  if (chunks.some((c) => c.isWord && c.text === t)) {
    return { matched: true, via: 'exact' };
  }

  const thr = fuzzyThreshold(t);
  for (const c of chunks) {
    if (c.isWord) continue; // never fuzzy over a different real word
    if (Math.abs(c.text.length - t.length) > thr) continue;
    if (editDistance(c.text, t) <= thr) {
      return { matched: true, via: 'fuzzy' };
    }
  }
  return { matched: false, via: null };
}
