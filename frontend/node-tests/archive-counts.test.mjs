import test from 'node:test';
import assert from 'node:assert/strict';
import { archiveCountError, archiveCountErrors, archiveCountFields, emptyArchiveCounts } from '../src/features/archive/archiveCounts.mjs';

test('archive counts start at zero and each archive receives its own values', () => {
  const counts = emptyArchiveCounts();
  assert.equal(Object.keys(counts).length, 5);
  assert.deepEqual(archiveCountErrors(counts), {});
  counts.tasks_count = 12;
  assert.equal(emptyArchiveCounts().tasks_count, 0);
  assert.deepEqual(Object.keys(counts), archiveCountFields.map(({ key }) => key));
});

test('archive counts accept whole nonnegative numbers within the API limit', () => {
  for (const value of [0, '0', 1, '18', 1000000]) assert.equal(archiveCountError(value), '');
  for (const value of ['', null, undefined, -1, '1.5', NaN, Infinity, 1000001]) {
    assert.notEqual(archiveCountError(value), '', String(value));
  }
  assert.deepEqual(Object.keys(archiveCountErrors({ ...emptyArchiveCounts(), tasks_count: -1, completed_parts_count: 0.5 })),
    ['tasks_count', 'completed_parts_count']);
});
