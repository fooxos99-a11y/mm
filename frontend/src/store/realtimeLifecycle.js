let realtimeUnsubscribe = null;
let realtimeModulePromise = null;

export const hasRealtimeSubscription = () => Boolean(realtimeUnsubscribe);
export const setRealtimeSubscription = (unsubscribe) => { realtimeUnsubscribe = unsubscribe; };

export const loadRealtimeModule = () => {
  if (!realtimeModulePromise) {
    realtimeModulePromise = import(
      /* webpackChunkName: "dashboard-realtime" */
      '../services/realtime'
    ).catch((error) => {
      realtimeModulePromise = null;
      throw error;
    });
  }
  return realtimeModulePromise;
};

export const cleanupDashboardRealtime = async () => {
  const unsubscribe = realtimeUnsubscribe;
  realtimeUnsubscribe = null;
  try {
    unsubscribe?.();
  } catch {
    // Realtime cleanup is best-effort and must not block logout.
  }
  if (!realtimeModulePromise) return;
  try {
    const { disconnectDashboardRealtime } = await realtimeModulePromise;
    if (!realtimeUnsubscribe) disconnectDashboardRealtime();
  } catch {
    // Realtime is optional; logout continues if its chunk fails.
  }
};
