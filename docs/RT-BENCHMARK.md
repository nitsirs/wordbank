# RT Benchmark — the north-star KPI

Source: Thailand national RT (Reading Test, ป.1), 10 years of exams BE 2558–2567 (2015–2024), incl. the official Test Blueprint (2560/2561) and แบบบันทึกคะแนน scoring rubrics. Issuing body: สทศ. / สพฐ.

The app exists to move RT scores. Every feature is reverse-engineered from this.

## The KPI: total RT score, 0–100

Two สมรรถนะ (competencies), 50 points each:

| Competency | Section | Pts | What's scored |
|---|---|---|---|
| **อ่านออกเสียง** (oral reading) | ตอน 1 คำ | 20 | accuracy per word (ถูก/ผิด, 1 pt each) |
| | ตอน 2 ข้อความ | 30 | fluency + prosody, per-sentence 0–3 rubric |
| **อ่านรู้เรื่อง** (comprehension) | คำจับคู่ (picture↔word) | 10 | match accuracy |
| | เล่าเรื่องจากภาพ | 10 | constructed response, 0/1/2 |
| | ประโยค MC | 20 | 3-choice MC × 10 |
| | ข้อความ MC + ข้อคิด | 10 | short passage / 4-line poem MC |

Writing (การเขียน) was **dropped from RT after 2559** — out of scope.

## The oral-reading fluency rubric (ตอน 2, the 30-pointer)

This is the construct that separates good from great readers. Verbatim from the 2567 examiner sheet:

- **ดีมาก (3):** reads every word smoothly and correctly, no hesitation, no sounding-out, no added/dropped words.
- **ดี (2):** all correct but hesitant/sounding-out/added-dropped, **or** 5–6 words correct.
- **พอใช้ (1):** 3–4 words correct.
- **ปรับปรุง (0):** 1–2 correct / can't read / won't read.

Examiner rules: student may re-read once (best attempt counts); if they stop > 2 min, ask whether to continue. **Fluency, not just accuracy, is what earns the top tier.**

## The 11 official word-characteristic tags

The examiner tags every อ่านออกเสียง word with one of these — this is the official taxonomy of what each word tests, and the app should tag its whole word bank the same way so progress maps to RT and the teacher knows exactly what to remediate:

สระเดี่ยวเสียงยาว · สระเดี่ยวเสียงสั้น · มีรูปวรรณยุกต์ · ไม่มีรูปวรรณยุกต์ · สระเปลี่ยนรูป · สระลดรูป · สระประสม · สะกดตรงมาตรา · สะกดไม่ตรงมาตรา · ควบกล้ำ · อักษรนำ

Worked example (2567 paper): ทาถู=สระเดี่ยวเสียงยาว · จืดจาง=สะกดตรงมาตรา · ข้าวเจ้า=มีรูปวรรณยุกต์ · รักษา=สระเปลี่ยนรูป · ทบทวน=สระลดรูป · ข้อมูล=สะกดไม่ตรงมาตรา · ตรงกลาง=ควบกล้ำ · หลงทาง=อักษรนำ.

## Comprehension indicators (the 50 pts)

ท 1.1 ป.1/2 word meaning · ป.1/3 answer questions (literal) · ป.1/4 retell/summarize · ป.1/5 predict · ป.1/7 read signs/symbols · ท 5.1 ป.1/1 state the moral (from prose/poetry).

Leniency rule: in อ่านรู้เรื่อง, misspellings are **not** penalized if meaning is conveyed (tests comprehension, not orthography).

## Gap map (current app → RT)

| RT section | App today | Gap-closer |
|---|---|---|
| คำ accuracy (20) | **~half** — receptive (tap-to-hear), not productive; no scoring of the child's own speech | **ASR read-aloud** scoring per word, tagged by the 11 characteristics |
| ข้อความ fluency (30) | **none** | graded passages + ASR measuring WCPM, hesitation, added/dropped words, scored on the ดีมาก→ปรับปรุง rubric |
| คำจับคู่ (10) | partial (sight vocab only) | picture↔word matching |
| MC comprehension (20) | none | 3-choice MC by indicator type |
| ข้อความ MC + ข้อคิด (10) | none | short-passage + poem MC |
| เล่าเรื่องจากภาพ (10) | none | guided sentence-builder (lower priority, hard to auto-score) |

**Net: the app currently trains roughly 20 of 100 RT points, and only the receptive half of that.**

## The two highest-value builds (priority order)

1. **ASR read-aloud scoring** — closes all 50 oral-reading points (word accuracy + passage fluency/prosody). Enabler: **Azure Speech (already a dependency) has Pronunciation Assessment** that returns accuracy/fluency/completeness/prosody — maps almost 1:1 to the RT rubric. Needs a check that th-TH pron-assessment is supported, then a "say it, then check" loop per word and per passage.
2. **Comprehension module** — closes the other 50 points (MC by indicator + picture-word match).

The gamification (leaderboard/rewards) wraps both; it does not, on its own, move RT scores.

## In-app KPIs that predict the RT composite

1. Word-read accuracy rate, broken down by the 11 tags.
2. Passage fluency: per-sentence 0–3 + WCPM + hesitation count + added/dropped words.
3. Sight-word mastery (FSRS retention on the word bank) — leading indicator before ASR lands.
4. Comprehension accuracy by indicator (ป.1/2, /3, /5, /7, ท 5.1 /1).
5. Picture-story retell completeness (0/1/2).

These can be weighted against the 20/30/10/10/20/10 skeleton to surface a per-student **projected RT score**.

## Not found in the archive
National proficiency bands / ผ่าน cut-scores, and any NT ป.3 or O-NET ป.6 linkage, are **not** in this PDF set — would need a separate สพฐ. regulations document.
