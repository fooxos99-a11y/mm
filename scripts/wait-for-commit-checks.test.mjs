import assert from 'node:assert/strict';
import test from 'node:test';
import { requiredCheckStates, waitForCommitChecks } from './wait-for-commit-checks.mjs';

const sha = 'a'.repeat(40);
const verify = (overrides = {}) => ({
  id: 1, head_sha: sha, path: '.github/workflows/verify.yml',
  status: 'completed', conclusion: 'success', ...overrides,
});
const sonar = (overrides = {}) => ({
  id: 1, head_sha: sha, name: 'SonarCloud Code Analysis', app: { slug: 'sonarqubecloud' },
  status: 'completed', conclusion: 'success', ...overrides,
});
const options = { repo: 'example/momars', sha, token: 'synthetic-test-token', log: () => {} };
const responses = (run, check) => async (url) => ({
  ok: true,
  json: async () => url.includes('/actions/workflows/verify.yml/runs') ? { workflow_runs: run } : { check_runs: check },
});

test('release requires Verify and the real Sonar app for the exact commit', () => {
  assert.deepEqual(requiredCheckStates([verify()], [sonar()], sha), { Verify: 'success', SonarCloud: 'success' });
  assert.deepEqual(requiredCheckStates([verify({ head_sha: 'b'.repeat(40) })], [sonar()], sha), {
    Verify: 'pending', SonarCloud: 'success',
  });
  assert.equal(requiredCheckStates([verify()], [sonar({ app: { slug: 'another-app' } })], sha).SonarCloud, 'pending');
});

test('newest attempt controls approval and unrelated monitoring failures do not approve or block it', () => {
  const runs = [verify({ conclusion: 'failure' }), verify({ id: 2 }), verify({ id: 3, path: 'monitor.yml', conclusion: 'failure' })];
  assert.equal(requiredCheckStates(runs, [sonar()], sha).Verify, 'success');
  assert.equal(requiredCheckStates([verify(), verify({ id: 2, status: 'in_progress' })], [sonar()], sha).Verify, 'pending');
});

test('a failed required check blocks release immediately', async () => {
  for (const failing of ['Verify', 'SonarCloud']) {
    const run = verify({ conclusion: failing === 'Verify' ? 'failure' : 'success' });
    const check = sonar({ conclusion: failing === 'SonarCloud' ? 'failure' : 'success' });
    await assert.rejects(waitForCommitChecks({ ...options, fetcher: responses([run], [check]) }), /Release blocked/);
  }
});

test('pending checks are polled until both pass', async () => {
  let attempt = 0;
  let pauses = 0;
  const fetcher = async (url) => {
    if (url.includes('/actions/workflows/verify.yml/runs')) attempt += 1;
    return responses([verify()], [sonar({ status: attempt === 1 ? 'in_progress' : 'completed' })])(url);
  };
  await waitForCommitChecks({ ...options, fetcher, pause: async () => { pauses += 1; } });
  assert.equal(pauses, 1);
  assert.equal(attempt, 2);
});

test('missing checks, denied access, and invalid responses fail closed without logging the token', async () => {
  await assert.rejects(waitForCommitChecks({ ...options, timeoutMs: 0, fetcher: responses([], []) }), /did not finish/);
  await assert.rejects(waitForCommitChecks({ ...options, fetcher: async () => ({ ok: false, status: 403 }) }), /HTTP 403/);
  await assert.rejects(waitForCommitChecks({ ...options, fetcher: async () => ({ ok: true, json: async () => ({}) }) }), /invalid check response/);
  await assert.rejects(waitForCommitChecks({ ...options, sha: 'main' }), /exact commit SHA/);
});
