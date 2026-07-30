/**
 * Map PA PronScore → the RT 0-3 oral-reading grade.
 * Thresholds are a sensible first guess; Tong to confirm against the official RT
 * ป.1 rubric PDF (~/Downloads/โครงสร้างการอ่าน RT ป.1 ปี68.pdf) before trusting auto-scoring.
 */
export type OralGrade = 0 | 1 | 2 | 3;

export const GRADE_LABEL: Record<OralGrade, string> = {
  3: '3 · อ่านคล่องแคล่ว',
  2: '2 · คล่องปานกลาง',
  1: '1 · ยังอ่านฝืด',
  0: '0 · อ่านไม่ได้',
};

export function pronToGrade(pron: number): OralGrade {
  if (pron >= 85) return 3;
  if (pron >= 70) return 2;
  if (pron >= 50) return 1;
  return 0;
}
