import assert from 'node:assert/strict';
import test from 'node:test';
import { documentPageSlices } from '../src/utils/documentPdfLayout.mjs';

test('PDF pages cover the complete document and preserve paragraph boundaries', () => {
  assert.deepEqual(documentPageSlices(2100, [{ top: 900, bottom: 1100 }], 1000), [
    { start: 0, height: 900 }, { start: 900, height: 1000 }, { start: 1900, height: 200 },
  ]);
  assert.deepEqual(documentPageSlices(1000, [], 1000), [{ start: 0, height: 1000 }]);
});

test('PDF pagination handles nested blocks, long paragraphs, final pages and invalid measurements', () => {
  assert.deepEqual(documentPageSlices(2200, [
    { top: 950, bottom: 1100 }, { top: 900, bottom: 980 }, { top: 0, bottom: 2200 },
    { top: 100, bottom: 100 }, { top: NaN, bottom: 700 },
  ], 1000), [{ start: 0, height: 900 }, { start: 900, height: 1000 }, { start: 1900, height: 300 }]);
  assert.deepEqual(documentPageSlices(2200, [{ top: 0, bottom: 2200 }], 1000), [
    { start: 0, height: 1000 }, { start: 1000, height: 1000 }, { start: 2000, height: 200 },
  ]);
  for (const height of [0, -1, NaN, Infinity]) assert.deepEqual(documentPageSlices(height), []);
  assert.deepEqual(documentPageSlices(500, [], 0), []);
  assert.deepEqual(documentPageSlices(500, [], NaN), []);
});
