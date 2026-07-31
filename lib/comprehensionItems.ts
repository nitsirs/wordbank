/**
 * Comprehension items — seeded from the REAL RT ป.1 exam (year 2567 / 2024),
 * การอ่านรู้เรื่อง ตอน ๒ (sentence MC) + ตอน ๓ (passage/poem MC).
 * Source: ~/Desktop/kru-kan/rt-exam/ข้อสอบ RT ปี 58 ถึง ปี 67/ปี 2567.
 * Answers verified against the comprehension of each stem; a few ambiguous items
 * from the paper are omitted until cross-checked with the official เฉลย.
 * TODO: expand across all 10 years (2558–2567) + add ตอน ๑ word-picture + ตอน ๒
 * picture-retell (those need image assets).
 */
export type CompType = 'sentence' | 'passage' | 'poem';

export interface CompItem {
  id: string;
  year: number;
  type: CompType;
  stem: string[]; // passage/sentence/poem lines
  question: string;
  choices: string[];
  answer: number; // index 0..2
  indicator: string;
}

export const COMPREHENSION_ITEMS: CompItem[] = [
  {
    id: '67-01', year: 2567, type: 'poem',
    stem: ['หนูแดงน่ารัก รู้จักแบ่งปัน', 'สิ่งของให้กัน เพื่อนรักใจจริง'],
    question: 'หนูแดงเป็นคนอย่างไร',
    choices: ['มีความซื่อสัตย์', 'มีความเอื้อเฟื้อ', 'มีความกตัญญู'],
    answer: 1,
    indicator: 'ท 5.1 ป.1/1 ข้อคิด',
  },
  {
    id: '67-02', year: 2567, type: 'passage',
    stem: ['ลำไย ละมุด มีเปลือกสีน้ำตาล', 'มะม่วง ฝรั่ง แตงโม มีเปลือกสีเขียว'],
    question: 'ผลไม้ในข้อใดมีสีเปลือกไม่เหมือนกัน',
    choices: ['ลำไย ละมุด', 'มะม่วง แตงโม', 'ฝรั่ง ลำไย'],
    answer: 2,
    indicator: 'ท 1.1 ป.1/3 ตอบคำถาม',
  },
  {
    id: '67-03', year: 2567, type: 'sentence',
    stem: ['นักเรียนทำเวรประจำวัน วิไลลบกระดานดำ ส่วนสุดาและมาลีนำขยะไปทิ้งที่โรงเก็บขยะ'],
    question: 'ใครอยู่ในห้องเรียน',
    choices: ['สุดา', 'มาลี', 'วิไล'],
    answer: 2,
    indicator: 'ท 1.1 ป.1/3 ตอบคำถาม',
  },
  {
    id: '67-04', year: 2567, type: 'sentence',
    stem: ['สมชายชวนเดชาเดินไปดูชาลีกำลังแข่งเรือใบที่ทะเล'],
    question: 'ใครอยู่ในทะเล',
    choices: ['สมชาย', 'เดชา', 'ชาลี'],
    answer: 2,
    indicator: 'ท 1.1 ป.1/3 ตอบคำถาม',
  },
  {
    id: '67-05', year: 2567, type: 'sentence',
    stem: ['น้องถือน้ำส้มที่แม่เทใส่แก้วมาให้พ่อดื่ม'],
    question: 'ใครเป็นคนเตรียมน้ำส้ม',
    choices: ['พ่อ', 'แม่', 'น้อง'],
    answer: 1,
    indicator: 'ท 1.1 ป.1/3 ตอบคำถาม',
  },
  {
    id: '67-06', year: 2567, type: 'sentence',
    stem: ['มะนาวผลกลม ลูกเล็ก มีรสเปรี้ยวมาก'],
    question: 'เรื่องใดของมะนาวที่ไม่ได้กล่าวถึง',
    choices: ['สี', 'ขนาด', 'รสชาติ'],
    answer: 0,
    indicator: 'ท 1.1 ป.1/2 ความหมายของคำ',
  },
  {
    id: '67-07', year: 2567, type: 'sentence',
    stem: ['ในทุก ๆ วัน น้ำจะออกกำลังกาย แล้วเล่นดนตรี', 'หลังจากที่ทำการบ้านหรือทบทวนบทเรียน'],
    question: 'น้ำทำอะไรเป็นลำดับสุดท้าย',
    choices: ['ออกกำลังกาย', 'ทำการบ้าน', 'เล่นดนตรี'],
    answer: 2,
    indicator: 'ท 1.1 ป.1/5 เล่าเรื่องย่อ/ลำดับ',
  },
  {
    id: '67-08', year: 2567, type: 'passage',
    stem: ['ออมกินอาหารครบห้าหมู่และออกกำลังกายเป็นประจำ', 'แต้วกินแต่ผักและชอบออกกำลังกาย', 'จิ๋วกินอาหารครบห้าหมู่แต่ไม่ออกกำลังกาย'],
    question: 'ใครน่าจะสุขภาพดีที่สุด',
    choices: ['แต้ว', 'จิ๋ว', 'ออม'],
    answer: 2,
    indicator: 'ท 1.1 ป.1/5 คาดการณ์',
  },
  {
    id: '67-09', year: 2567, type: 'passage',
    stem: ['มุกดาเป็นคนสวย เสียงดี ชอบดูรายการเพลงทุกประเภท', 'และฟังเพลงที่มีจังหวะ เธอมีความใฝ่ฝันที่จะเป็นศิลปินที่มีชื่อเสียงในอนาคต'],
    question: 'ข้างหน้ามุกดาน่าจะมีอาชีพใด',
    choices: ['นักเขียน', 'นักร้อง', 'นักข่าว'],
    answer: 1,
    indicator: 'ท 1.1 ป.1/5 คาดการณ์',
  },
];
