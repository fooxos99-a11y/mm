import assert from 'node:assert/strict';
import test from 'node:test';
import createSingleFlight from '../src/utils/createSingleFlight.mjs';

test('shares an in-flight request and resets after it settles', async () => {
  const singleFlight = createSingleFlight();
  let calls = 0;
  let release;

  const requestFactory = () => {
    calls += 1;
    return new Promise((resolve) => {
      release = resolve;
    });
  };

  const first = singleFlight(requestFactory);
  const second = singleFlight(requestFactory);

  await Promise.resolve();
  assert.equal(calls, 1);
  assert.strictEqual(first, second);

  release('snapshot');
  assert.equal(await first, 'snapshot');
  assert.equal(await second, 'snapshot');

  assert.equal(await singleFlight(async () => {
    calls += 1;
    return 'fresh snapshot';
  }), 'fresh snapshot');
  assert.equal(calls, 2);
});

test('clears a rejected request so a later retry can run', async () => {
  const singleFlight = createSingleFlight();
  let calls = 0;

  await assert.rejects(singleFlight(async () => {
    calls += 1;
    throw new Error('network');
  }), /network/);

  assert.equal(await singleFlight(async () => {
    calls += 1;
    return 'recovered';
  }), 'recovered');
  assert.equal(calls, 2);
});

test('does not share requests across different session keys', async () => {
  const singleFlight = createSingleFlight();
  let calls = 0;

  const oldSession = singleFlight(async () => {
    calls += 1;
    return 'old-session';
  }, 'token-a');
  const newSession = singleFlight(async () => {
    calls += 1;
    return 'new-session';
  }, 'token-b');

  assert.notStrictEqual(oldSession, newSession);
  assert.deepEqual(await Promise.all([oldSession, newSession]), ['old-session', 'new-session']);
  assert.equal(calls, 2);
});
