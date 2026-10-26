// Cookie-based authentication must not race responses that renew an older session cookie.
export const createSessionBoundary = () => {
  const pending = new Set();
  let gate = null;
  let queue = Promise.resolve();
  const beforeRequest = async (config) => {
    if (!config.sessionMutation) while (gate) await gate;
    let release;
    const completion = new Promise((resolve) => { release = resolve; });
    pending.add(completion);
    config.releaseSessionRequest = () => { pending.delete(completion); release(); };
    return config;
  };
  const settle = (config) => config?.releaseSessionRequest?.();
  const runExclusive = (operation) => {
    const request = queue.then(async () => {
      let unlock;
      gate = new Promise((resolve) => { unlock = resolve; });
      try {
        await Promise.all([...pending]);
        return await operation();
      } finally { gate = null; unlock(); }
    });
    queue = request.catch(() => {});
    return request;
  };
  return { beforeRequest, settle, runExclusive };
};
