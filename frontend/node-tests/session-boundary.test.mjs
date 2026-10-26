import assert from 'node:assert/strict';
import test from 'node:test';
import { createSessionBoundary } from '../src/services/sessionBoundary.mjs';

test('session mutations drain earlier responses and hold new requests until the cookie is replaced', async () => {
  const boundary = createSessionBoundary();
  const previous = await boundary.beforeRequest({});
  const events = [];
  let releaseMutation;
  const mutation = boundary.runExclusive(async () => {
    events.push('login');
    const config = await boundary.beforeRequest({ sessionMutation: true });
    await new Promise((resolve) => { releaseMutation = resolve; });
    boundary.settle(config);
    events.push('new-cookie');
  });
  await Promise.resolve();
  const next = boundary.beforeRequest({}).then((config) => { events.push('next-request'); return config; });
  await Promise.resolve();
  assert.deepEqual(events, []);
  boundary.settle(previous);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(events, ['login']);
  releaseMutation(); await mutation;
  boundary.settle(await next);
  assert.deepEqual(events, ['login', 'new-cookie', 'next-request']);
});

test('failed authentication unlocks requests and subsequent session changes still run', async () => {
  const boundary = createSessionBoundary();
  await assert.rejects(boundary.runExclusive(async () => { throw new Error('invalid credentials'); }), /invalid/);
  const config = await boundary.beforeRequest({});
  boundary.settle(config); boundary.settle(config);
  assert.equal(await boundary.runExclusive(async () => 'logout'), 'logout');
});

test('simultaneous session mutations execute in order', async () => {
  const boundary = createSessionBoundary(); const events = [];
  await Promise.all([
    boundary.runExclusive(async () => { events.push('login'); await Promise.resolve(); events.push('login-complete'); }),
    boundary.runExclusive(async () => { events.push('logout'); }),
  ]);
  assert.deepEqual(events, ['login', 'login-complete', 'logout']);
});
