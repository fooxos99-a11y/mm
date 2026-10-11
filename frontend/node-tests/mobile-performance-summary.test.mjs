import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeMobilePerformance } from '../scripts/mobile-performance-summary.mjs';

const audit = (score, lcp = 2200) => ({ lhr: {
  categories: { performance: { score: score / 100 } },
  audits: { 'largest-contentful-paint': { numericValue: lcp } },
} });

test('one noisy run does not outweigh two healthy mobile measurements', () => {
  const results = [audit(89, 2800), audit(98, 2200), audit(97, 2100)];
  const summary = summarizeMobilePerformance(results);
  assert.equal(summary.score, 97);
  assert.equal(summary.lcp, 2200);
  assert.equal(summary.result, results[2]);
  assert.equal(summary.samples.length, 3);
});

test('persistent performance regressions still fail the unchanged score and LCP limits', () => {
  assert.equal(summarizeMobilePerformance([audit(98), audit(89), audit(87)]).score < 90, true);
  assert.equal(summarizeMobilePerformance([audit(98, 2900), audit(98, 2600), audit(98, 2200)]).lcp > 2500, true);
});

test('failed or incomplete audits cannot be counted as passing measurements', () => {
  assert.throws(() => summarizeMobilePerformance([audit(98)]), /three complete audits/);
  assert.throws(() => summarizeMobilePerformance([audit(98), audit(98), {}]), /incomplete/);
  assert.throws(() => summarizeMobilePerformance([audit(98), audit(98),
    { lhr: { runtimeError: { code: 'NO_FCP', message: 'No paint' } } }]), /NO_FCP/);
});
