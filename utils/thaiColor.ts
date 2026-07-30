/**
 * Thai reading-color engine — generalizes ครูกาญ's "สื่อการสอนใช้สี" so ANY Thai
 * word can be auto-colored, not only the hand-curated ป.1 set.
 *
 * Color scheme (from the innovation doc):
 *   พยัญชนะ (consonant)      → black   #1A1A1A
 *   สระ (vowel)              → red     #E53935
 *   ตัวสะกด (coda consonant) → blue    #1E88E5
 *   วรรณยุกต์ (tone mark)     → green   #2E9E5B
 *   พยัญชนะเงียบ (silent)     → gray    #BDBDBD  (consonant before ์)
 *
 * v1 heuristic for coda (ตัวสะกด) detection. Walks each syllable tracking
 * whether the vowel has appeared and whether the onset is placed; a consonant
 * after the vowel+onset is the coda. Matches the curated ป.1 data on common
 * cases (กาง, กาย, ขวา, ไม่, ครับ, หนู). Residual errors on vowel trigraphs
 * (เีย, เือ, ัว) and complex clusters — flag for ครูกาญ to eyeball.
 */

export type CharClass =
  | "consonant"
  | "vowel"
  | "tone"
  | "coda"
  | "silent"
  | "other";

export interface ColoredChar {
  char: string;
  cls: CharClass;
}

export const COLORS: Record<CharClass, string> = {
  consonant: "#1A1A1A",
  vowel: "#E53935",
  coda: "#1E88E5",
  tone: "#2E9E5B",
  silent: "#BDBDBD",
  other: "#1A1A1A",
};

/** Map the curated ป.1 data's color names onto the same palette. */
const NAME_TO_CLASS: Record<string, CharClass> = {
  black: "consonant",
  red: "vowel",
  blue: "coda",
  green: "tone",
  gray: "silent",
  grey: "silent",
};

const CONSONANTS = new Set(
  "กขฃคฅฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ".split("")
);
const LEAD_VOWELS = new Set("เแโใไ".split("")); // pre-consonant
const FOLLOW_VOWELS = new Set("าำะๅ".split("")); // post-consonant
const ABOVE_VOWELS = new Set("ิีึืั็".split(""));
const BELOW_VOWELS = new Set("ุู".split(""));
const TONES = new Set("่้๊๋".split(""));
const SILENT_MARK = "์"; // thanthakhat — silences the consonant before it

function isVowel(ch: string): boolean {
  return (
    LEAD_VOWELS.has(ch) ||
    FOLLOW_VOWELS.has(ch) ||
    ABOVE_VOWELS.has(ch) ||
    BELOW_VOWELS.has(ch)
  );
}

/**
 * Auto-classify a plain Thai word string into colored segments.
 */
export function classifyWord(text: string): ColoredChar[] {
  const chars = Array.from(text);
  const n = chars.length;
  const segs: ColoredChar[] = chars.map((char) => {
    let cls: CharClass = "other";
    if (TONES.has(char)) cls = "tone";
    else if (char === SILENT_MARK) cls = "other";
    else if (isVowel(char)) cls = "vowel";
    else if (CONSONANTS.has(char)) cls = "consonant";
    return { char, cls };
  });

  // Second pass: place codas (ตัวสะกด) by tracking each syllable's vowel/onset.
  let vowelSeen = false; // has the current syllable's vowel appeared?
  let onsetFixed = false; // has the current syllable's onset consonant been placed?
  for (let i = 0; i < n; i++) {
    const s = segs[i];
    if (s.cls === "vowel") {
      vowelSeen = true;
      // lead vowels precede their onset; non-lead vowels follow (so onset is now fixed)
      if (!LEAD_VOWELS.has(s.char)) onsetFixed = true;
    } else if (s.cls === "consonant") {
      if (!vowelSeen || !onsetFixed) {
        // onset (or onset cluster) — black. After a lead vowel this is the onset.
        onsetFixed = true;
      } else {
        // consonant after the vowel+onset → coda (ตัวสะกด) — blue
        s.cls = "coda";
        vowelSeen = false;
        onsetFixed = false;
      }
    } else if (s.cls !== "tone") {
      // other chars (space, digit, latin, ๆ ฯ) start fresh
      vowelSeen = false;
      onsetFixed = false;
    }
  }

  // Thanthakhat (์) silences the nearest preceding consonant.
  for (let i = 1; i < n; i++) {
    if (segs[i].char === SILENT_MARK && CONSONANTS.has(segs[i - 1].char)) {
      segs[i - 1].cls = "silent";
    }
  }

  return segs;
}

/**
 * Normalize curated segments ({char, color:"black"|"red"|...}) into the same
 * ColoredChar shape so one component renders both sources identically.
 */
export function fromCurated(
  word: { char: string; color: string }[]
): ColoredChar[] {
  return word.map(({ char, color }) => ({
    char,
    cls: NAME_TO_CLASS[color] ?? "other",
  }));
}
