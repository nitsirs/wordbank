# Comprehension module — design scaffold (the other 50 pts)

> The decoding half (words + sentences) is built. This specs the comprehension
> half so it can be built next. It is the language-comprehension strand of the
> Simple View of Reading (see PRODUCT-VISION.md). Not yet implemented.

## RT rubric (comprehension = 50)
- 10 pts word-meaning (match word → meaning/picture)
- 10 pts picture-retell (answer about a picture)
- 20 pts sentence-comp (read sentence → choose answer)
- 10 pts text-comp (read short passage → answer)

A kid who decodes but can't do these isn't reading yet — hence both halves train.

## Data model (proposed)
```sql
-- comprehension_passages (for text-comp)
--   id, text (short passage), source
-- comprehension_items
--   id, type ('word_meaning'|'picture_retell'|'sentence_comp'|'text_comp'),
--   prompt, choices jsonb, answer_index int,
--   picture_url text null, passage_id int null, source
```
Items are 0/1 scored; sum × (50 / item_count) → the 50-pt subscore.

## Build phases (recommended order)
1. **word_meaning + sentence_comp** — text-only, no assets needed. Fastest to a
   working comprehension drill; reuses the quiz UI pattern.
2. **text_comp** — needs a small set of ป.1-level passages (4-6 sentences) + items.
3. **picture_retell** — needs illustrations (generate or source). Highest asset cost.

## Item sourcing
Curate from the RT practice materials + สถาบันภาษาไทย ป.1 word lists. Seed like
`scripts/seed_p1_words.mjs`. Tie item vocabulary to the p1 word pool so
comprehension reinforces decoding (Simple View: the two strands compound).

## Scoring + gamification
Each correct item earns XP (same gamify engine) and counts toward the
leaderboard/classroom — comprehension practice should feed the same progression,
not be a silo.

**Wired 2026-07-31** (`services/db.ts` `submitItemReview`): comprehension +
picture-match pages write to the same `review_events` table as word review
(`mode='comprehension'|'picture'`, `word_id=null`, `item_id`=the item/word),
so leaderboard XP already includes them with no aggregation changes needed.
Needs `scripts/sql/comprehension_events.sql` applied first (word_id → nullable)
— pending on the Mac mini, see its handoff doc.

## Open
- Get the official RT comprehension item bank (Tong).
- Picture assets for picture-retell (generate? commission?).
- Decide pass-threshold per subscale (RT uses 0/1 per item; the 50-pt mapping).
