import assert from 'node:assert/strict';
import test from 'node:test';
import { acquireAttendancePosition } from '../src/utils/attendancePosition.mjs';

function fixture(overrides = {}) {
  const cleared = [];
  let expired;
  let success;
  let failure;
  const geolocation = {
    watchPosition(onSuccess, onError, options) {
      success = onSuccess; failure = onError;
      assert.deepEqual(options, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
      return 0;
    },
    clearWatch: id => cleared.push(id),
  };
  const challenge = { serverTime: 200000, startedAt: 9900, receivedAt: 10000, maxAccuracy: 50, ...overrides };
  const promise = acquireAttendancePosition(geolocation, challenge, {
    now: () => 10000, setTimer: callback => { expired = callback; return 123; },
    clearTimer: id => assert.equal(id, 123),
  });
  return { promise, cleared, sample: value => success(value), error: value => failure(value), expire: () => expired() };
}
const sample = (overrides = {}) => ({ coords: { latitude: 24.7, longitude: 46.6, accuracy: 10 }, timestamp: 10001, ...overrides });

test('waits through cached and coarse fixes until a fresh accurate sensor sample arrives', async () => {
  const f = fixture();
  f.sample(sample({ timestamp: 9999 }));
  f.sample(sample({ coords: { latitude: 24.7, longitude: 46.6, accuracy: 500 } }));
  assert.deepEqual(f.cleared, []);
  f.sample(sample());
  assert.deepEqual(await f.promise, { latitude: 24.7, longitude: 46.6, accuracy: 10, timestamp: 200001 });
  assert.deepEqual(f.cleared, [0]);
  f.sample(sample());
  f.error({ code: 1 });
  assert.deepEqual(f.cleared, [0]);
});

test('translates acquisition timestamps when the device clock is ahead or behind the server', async () => {
  for (const serverTime of [1000, 900000]) {
    const f = fixture({ serverTime });
    f.sample(sample());
    assert.equal((await f.promise).timestamp, serverTime + 1);
  }
});

test('rejects stale, future, nonfinite and out-of-range samples without returning a made-up fix', async () => {
  const f = fixture();
  for (const position of [sample({ timestamp: 9999 }), sample({ timestamp: 20000 }),
    sample({ timestamp: NaN }), sample({ coords: { latitude: 91, longitude: 46, accuracy: 10 } }),
    sample({ coords: { latitude: 24, longitude: 181, accuracy: 10 } })]) f.sample(position);
  f.expire();
  await assert.rejects(f.promise, error => error.userMessage.includes('تحديث موقعك'));
  assert.deepEqual(f.cleared, [0]);
});

test('poor or zero accuracy times out with actionable precise-location guidance', async () => {
  for (const accuracy of [0, 51]) {
    const f = fixture();
    f.sample(sample({ coords: { latitude: 24, longitude: 46, accuracy } }));
    f.expire();
    await assert.rejects(f.promise, error => error.userMessage.includes('الموقع الدقيق'));
    assert.deepEqual(f.cleared, [0]);
  }
});

test('permission denial stops watching immediately without waiting for another sample', async () => {
  const f = fixture();
  f.error({ code: 1 });
  await assert.rejects(f.promise, error => error.code === 1 && error.userMessage.includes('لم يُسمح'));
  assert.deepEqual(f.cleared, [0]);
});

test('transient acquisition errors allow a later accurate fix', async () => {
  const f = fixture();
  f.error({ code: 2 });
  f.error({ code: 3 });
  f.sample(sample());
  await f.promise;
  assert.deepEqual(f.cleared, [0]);
});

test('invalid server policy never starts the sensor', async () => {
  for (const overrides of [{ maxAccuracy: 0 }, { serverTime: NaN }, { startedAt: 10001 }]) {
    await assert.rejects(fixture(overrides).promise, /Invalid attendance location policy/);
  }
});

test('synchronous adapters use default timing options and still stop watching', async () => {
  const cleared = [];
  const timestamp = Date.now();
  const position = await acquireAttendancePosition({
    watchPosition(success) { success({ coords: { latitude: 24, longitude: 46, accuracy: 10 }, timestamp: Date.now() }); return 7; },
    clearWatch: id => cleared.push(id),
  }, { serverTime: timestamp, startedAt: timestamp, receivedAt: timestamp, maxAccuracy: 100 });
  assert.equal(position.accuracy, 10);
  assert.deepEqual(cleared, [7]);
});

test('sensor setup failures reject and cancel the deadline', async () => {
  let cleared = false;
  await assert.rejects(acquireAttendancePosition({ watchPosition() { throw new Error('Sensor failed'); } },
    { serverTime: 10, startedAt: 10, receivedAt: 10, maxAccuracy: 10 },
    { now: () => 10, setTimer: () => 1, clearTimer: () => { cleared = true; } }), /Sensor failed/);
  assert.equal(cleared, true);
});
