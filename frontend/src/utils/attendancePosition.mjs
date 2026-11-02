export function acquireAttendancePosition(geolocation, challenge, {
  now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout, timeout = 20000,
} = {}) {
  const { serverTime, startedAt, receivedAt, maxAccuracy } = challenge;
  if (![serverTime, startedAt, receivedAt, maxAccuracy].every(Number.isFinite)
    || maxAccuracy <= 0 || receivedAt < startedAt) {
    return Promise.reject(new Error('Invalid attendance location policy'));
  }
  // Anchor acquisition time to receipt of the server response. This conservatively
  // excludes reply latency instead of making a valid fix appear to be in the future.
  const clockOffset = serverTime - receivedAt;
  const requestedAt = now();
  return new Promise((resolve, reject) => {
    let watchId;
    let settled = false;
    let message = 'تعذر تحديث موقعك. فعّل خدمات الموقع وحاول مرة أخرى.';
    const finish = (error, position) => {
      if (settled) return;
      settled = true;
      clearTimer(timer);
      if (watchId !== undefined) geolocation.clearWatch(watchId);
      if (error) reject(error);
      else resolve(position);
    };
    const timer = setTimer(() => finish(Object.assign(new Error(message), { userMessage: message })), timeout);
    try {
      watchId = geolocation.watchPosition(position => {
        if (settled) return;
        const { latitude, longitude, accuracy } = position.coords;
        if (![latitude, longitude, accuracy, position.timestamp].every(Number.isFinite)
          || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return;
        if (position.timestamp < requestedAt || position.timestamp > now() + 5000) return;
        if (accuracy <= 0 || accuracy > maxAccuracy) {
          message = 'دقة الموقع غير كافية. فعّل الموقع الدقيق وحاول مرة أخرى.';
          return;
        }
        finish(null, { latitude, longitude, accuracy, timestamp: position.timestamp + clockOffset });
      }, error => {
        if (error.code === 1) {
          const userMessage = 'لم يُسمح بالوصول إلى الموقع. اسمح بالوصول وحاول مرة أخرى.';
          finish(Object.assign(new Error(userMessage), { userMessage, code: 1 }));
        }
      }, { enableHighAccuracy: true, maximumAge: 0, timeout });
      // Native callbacks are asynchronous; this also safely handles synchronous adapters.
      if (settled) geolocation.clearWatch(watchId);
    } catch (error) { finish(error); }
  });
}
