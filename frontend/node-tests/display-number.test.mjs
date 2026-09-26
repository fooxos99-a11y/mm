import assert from 'node:assert/strict';
import test from 'node:test';
import { splitDisplayNumber } from '../src/utils/displayNumber.mjs';

const LEGACY_PATTERN = /^(.*?)([+-]?\d+(?:\.\d+)?)([^\d]*)$/;

const legacySplit = (text) => {
  const match = LEGACY_PATTERN.exec(text);
  return match ? match.slice(1) : null;
};

test('splitDisplayNumber separates prefix, number and suffix', () => {
  assert.deepEqual(splitDisplayNumber('1820+'), ['', '1820', '+']);
  assert.deepEqual(splitDisplayNumber('95%'), ['', '95', '%']);
  assert.deepEqual(splitDisplayNumber('-12.5 طالب'), ['', '-12.5', ' طالب']);
  assert.deepEqual(splitDisplayNumber('نسبة 1.2.3'), ['نسبة 1.', '2.3', '']);
  assert.deepEqual(splitDisplayNumber(42), ['', '42', '']);
});

test('splitDisplayNumber returns null without a number or with a multi-line prefix', () => {
  assert.equal(splitDisplayNumber('--'), null);
  assert.equal(splitDisplayNumber(''), null);
  assert.equal(splitDisplayNumber('a\nb 5'), null);
  assert.deepEqual(splitDisplayNumber('5\n%'), ['', '5', '\n%']);
});

test('splitDisplayNumber matches the legacy regular expression', () => {
  const alphabet = ['1', '2', '.', '+', '-', 'a', ' ', '%', '\n', '٥'];
  let seed = 7;
  const next = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed;
  };

  for (let run = 0; run < 5000; run += 1) {
    let text = '';
    const length = next() % 9;
    for (let index = 0; index < length; index += 1) text += alphabet[next() % alphabet.length];
    assert.deepEqual(splitDisplayNumber(text), legacySplit(text), JSON.stringify(text));
  }
});
