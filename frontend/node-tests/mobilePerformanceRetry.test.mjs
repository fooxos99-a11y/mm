import assert from 'node:assert/strict';
import test from 'node:test';
import { runAuditWithRuntimeRetry } from '../scripts/mobile-performance-retry.mjs';

const audit = (score = 0.91, lcp = 2095) => ({
  lhr: { categories: { performance: { score } }, audits: { 'largest-contentful-paint': { numericValue: lcp } } },
});
const refused = (overrides = {}) => Object.assign(new Error('connect ECONNREFUSED'), {
  code: 'ECONNREFUSED', syscall: 'connect', address: '127.0.0.1', ...overrides,
});
const options = { warn: () => {} };

test('a completed low score or high LCP is never retried', async () => {
  for (const result of [audit(0.87), audit(0.95, 3000)]) {
    let calls = 0;
    assert.equal(await runAuditWithRuntimeRetry(async () => { calls += 1; return result; }, options), result);
    assert.equal(calls, 1);
  }
});

test('local Chrome connection refusal retries once and preserves both attempts', async () => {
  let calls = 0;
  const evidence = [];
  const result = audit();
  assert.equal(await runAuditWithRuntimeRetry(async () => {
    calls += 1;
    if (calls === 1) throw refused();
    return result;
  }, { ...options, onError: (_, attempt) => evidence.push(['error', attempt]),
    onResult: (_, attempt) => evidence.push(['result', attempt]) }), result);
  assert.equal(calls, 2);
  assert.deepEqual(evidence, [['error', 1], ['result', 2]]);
});

test('two local Chrome connection failures fail closed', async () => {
  let calls = 0;
  await assert.rejects(runAuditWithRuntimeRetry(async () => {
    calls += 1; throw refused();
  }, options), { code: 'ECONNREFUSED' });
  assert.equal(calls, 2);
});

test('unknown errors and non-local connection failures are never retried', async () => {
  for (const error of [new Error('invalid configuration'), refused({ address: '192.0.2.1' })]) {
    let calls = 0;
    await assert.rejects(runAuditWithRuntimeRetry(async () => {
      calls += 1; throw error;
    }, options), error);
    assert.equal(calls, 1);
  }
});

test('returned runtime errors retain the existing bounded retry', async () => {
  let calls = 0;
  const result = { lhr: { runtimeError: { code: 'NO_FCP' } } };
  assert.equal(await runAuditWithRuntimeRetry(async () => {
    calls += 1; return result;
  }, options), result);
  assert.equal(calls, 2);
});

