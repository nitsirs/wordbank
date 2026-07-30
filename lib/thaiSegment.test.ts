import { test } from 'node:test';
import assert from 'node:assert/strict';
import { norm, buildDict, segment, segmentChunks, editDistance, matchWord } from './thaiSegment.ts';

const DICT = buildDict(['ก้าว', 'กา', 'ตาก', 'ตา', 'น้ำ', 'กระ', 'ม้า', 'นก', 'บ้าน', 'กติกา']);

test('norm strips whitespace + punctuation, keeps Thai', () => {
  assert.equal(norm('ม้า นก, น้ำ!'), 'ม้านกน้ำ');
  assert.equal(norm(' ตา '), 'ตา');
});

test('editDistance basics', () => {
  assert.equal(editDistance('กา', 'กา'), 0);
  assert.equal(editDistance('กา', 'ก้า'), 1);   // extra tone mark
  assert.equal(editDistance('กา', 'กระ'), 2);
  assert.equal(editDistance('ตา', 'ตาก'), 1);
});

test('segment: longest-match picks ตาก over ตา', () => {
  // idealized clean run
  assert.deepEqual(segment('ก้าวกาตากตาน้ำ', DICT), ['ก้าว', 'กา', 'ตาก', 'ตา', 'น้ำ']);
});

test('matchWord exact: nesting does NOT false-fire', () => {
  // kid said ตาก, target is ตา → must NOT tick
  const r = matchWord('ตาก', 'ตา', DICT);
  assert.equal(r.matched, false);
  // kid said ตา, target ตา → tick exact
  assert.equal(matchWord('ตา', 'ตา', DICT).via, 'exact');
  // kid said ก้าว, target กา → must NOT tick (ก้าว is a different real word)
  assert.equal(matchWord('ก้าว', 'กา', DICT).matched, false);
});

test('matchWord exact in a multi-word run', () => {
  const stream = 'ม้านกน้ำ'; // no spaces, like real STT
  assert.equal(matchWord(stream, 'ม้า', DICT).via, 'exact');
  assert.equal(matchWord(stream, 'นก', DICT).via, 'exact');
  assert.equal(matchWord(stream, 'น้ำ', DICT).via, 'exact');
  assert.equal(matchWord(stream, 'บ้าน', DICT).matched, false); // not present
});

test('matchWord fuzzy: 1-char transcription slip on a leftover chunk', () => {
  // target กา, STT heard ก้า (one extra tone mark) as a leftover (not a dict word here)
  // build a dict WITHOUT ก้า so it lands as a leftover
  const d = buildDict(['กา', 'ตา', 'น้ำ']);
  assert.equal(matchWord('ก้า', 'กา', d).via, 'fuzzy');
});

test('matchWord fuzzy does NOT fire across a longer real word', () => {
  // target ตา, stream ตาก (a real dict word) → no fuzzy fire even though edit dist 1
  assert.equal(matchWord('ตาก', 'ตา', DICT).matched, false);
});

test('matchWord: STT mis-hear กา→กระ is NOT caught (by design — needs PA)', () => {
  // กระ is in DICT here, so it's a real word ≠ กา → no match. Documented limitation.
  assert.equal(matchWord('กระ', 'กา', DICT).matched, false);
});
