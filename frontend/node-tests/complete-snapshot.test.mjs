import assert from 'node:assert/strict';
import test from 'node:test';
import { loadCompleteSnapshot } from '../src/services/completeSnapshot.mjs';

test('snapshot collects older result pages and deduplicates boundary rows', async () => {
  const pages = [];
  const snapshot = await loadCompleteSnapshot(async (page) => {
    pages.push(page);
    return {
      students: [{ id: 'student' }],
      submissions: page === 1 ? [{ id: 'a' }] : [{ id: 'a' }, { id: 'b' }],
      snapshotMeta: { submissions: { total: 2, nextPage: page === 1 ? 2 : null } },
    };
  });
  assert.deepEqual(pages, [1, 2]);
  assert.deepEqual(snapshot.submissions.map((row) => row.id), ['a', 'b']);
  assert.equal(snapshot.snapshotMeta.submissions.returned, 2);
  assert.equal(snapshot.snapshotMeta.submissions.truncated, false);
  assert.equal(snapshot.students.length, 1);
});

test('failed later page rejects the snapshot instead of publishing incomplete totals', async () => {
  await assert.rejects(loadCompleteSnapshot(async (page) => {
    if (page === 2) throw new Error('offline');
    return { snapshotMeta: { attendance: { nextPage: 2 } } };
  }), /offline/);
});

test('small snapshots finish without extra requests', async () => {
  let calls = 0;
  assert.deepEqual(await loadCompleteSnapshot(async () => { calls++; return {}; }), {});
  assert.equal(calls, 1);
});

test('manual score pages are collected even when there are no submitted answers', async () => {
  const pages = [];
  const snapshot = await loadCompleteSnapshot(async page => {
    pages.push(page);
    return { submissions: [{ id: `score-${page}`, scoreOnly: true }],
      snapshotMeta: { submissions: { total: 0, nextPage: null },
        manualScores: { total: 2, nextPage: page === 1 ? 2 : null } } };
  });
  assert.deepEqual(pages, [1, 2]);
  assert.equal(snapshot.submissions.length, 2);
  assert.equal(snapshot.snapshotMeta.manualScores.returned, 2);
  assert.equal(snapshot.snapshotMeta.manualScores.truncated, false);
});
