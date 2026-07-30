import { classifyWord, fromCurated, COLORS, type ColoredChar } from "@/utils/thaiColor";

interface ColoredWordProps {
  /** Plain string → auto-colored via the Thai classifier. */
  text?: string;
  /** Curated {char,color}[] (e.g. the hand-colored ป.1 data) → used as-is. */
  segments?: { char: string; color: string }[];
}

/**
 * Renders a Thai word in ครูกาญ's 4-color scheme. One inline colored word:
 * พยัญชนะ black / สระ red / ตัวสะกด blue / วรรณยุกต์ green.
 * Parent controls size/weight via its own className (e.g. an <h1>).
 */
export function ColoredWord({ text, segments }: ColoredWordProps) {
  let segs: ColoredChar[];
  if (segments) {
    segs = fromCurated(segments);
  } else {
    segs = classifyWord(text ?? "");
  }

  return (
    <>
      {segs.map((s, i) => (
        <span key={i} style={{ color: COLORS[s.cls] }}>
          {s.char}
        </span>
      ))}
    </>
  );
}
