import { fetchDashboardSnapshot, fetchDashboardShell, fetchNotifications } from '../../services/dashboardSnapshotApi';
import {
  hasRealtimeSubscription,
  loadRealtimeModule,
  setRealtimeSubscription,
} from '../realtimeLifecycle';
export { createDashboardState, dashboardMutations } from './storeState.mjs';

const requests = new WeakMap();

const replaceSnapshotSection = (state, commit, key, value) => {
  commit('setDashboardSnapshot', {
    ...state.dashboardSnapshot,
    [key]: value,
  });
};

export const dashboardActions = {
  refreshDashboardSnapshot({ state, dispatch }) {
    return dispatch('loadDashboardSnapshot', { mode: state.dashboardSnapshot?.snapshotMode === 'shell' ? 'shell' : 'full' });
  },
  async loadDashboardSnapshot({ state, commit }, { mode = 'full' } = {}) {
    if (!state.currentUser) {
      commit('setDashboardSnapshot', null);
      commit('setDashboardError', '');
      return;
    }

    const authGeneration = state.authGeneration;
    const requestId = (requests.get(state) || 0) + 1;
    requests.set(state, requestId);
    const isCurrent = () => state.authGeneration === authGeneration && requests.get(state) === requestId;
    commit('setDashboardLoading', true);
    commit('setDashboardError', '');
    try {
      const snapshot = await (mode === 'shell' ? fetchDashboardShell() : fetchDashboardSnapshot());
      if (isCurrent()) commit('setDashboardSnapshot', snapshot);
      return isCurrent();
    } catch (error) {
      if (!isCurrent()) return false;
      if (error?.response?.status === 401) {
        commit('clearAuthState');
        commit('setAuthChecked', true);
        commit('setDashboardError', 'انتهت صلاحية الجلسة. سجّل الدخول مرة أخرى.');
        return;
      }
      commit('setDashboardError', error?.response?.data?.message || error?.message || 'تعذر تحميل بيانات لوحة التحكم.');
    } finally {
      if (isCurrent()) commit('setDashboardLoading', false);
    }
    return false;
  },
  ensureDashboardSnapshot({ state, dispatch }, { mode = 'full' } = {}) {
    if (state.dashboardSnapshot && !state.dashboardError
      && (mode === 'shell' || state.dashboardSnapshot.snapshotMode !== 'shell')) return Promise.resolve(true);
    return dispatch('loadDashboardSnapshot', { mode });
  },
  initializeDashboard({ state, dispatch }) {
    if (!state.currentUser || (state.currentUser.role !== 'student' && state.currentUser.mustChangePassword)) return Promise.resolve();
    return Promise.all([
      dispatch('ensureDashboardSnapshot', {
        mode: ['admin', 'male_manager', 'female_manager'].includes(state.currentUser.role) ? 'shell' : 'full',
      }),
      dispatch('initializeRealtime'),
    ]);
  },
  async initializeRealtime({ state, dispatch }) {
    if (!state.currentUser || hasRealtimeSubscription() || !['admin', 'male_manager', 'female_manager'].includes(state.currentUser?.role)) return;

    const authGeneration = state.authGeneration;
    let realtime;
    try {
      realtime = await loadRealtimeModule();
    } catch {
      return;
    }
    if (state.authGeneration !== authGeneration || !state.currentUser || hasRealtimeSubscription()) return;

    setRealtimeSubscription(realtime.subscribeDashboardRealtime({
      user: state.currentUser,
      onNotificationCreated: () => dispatch('reloadNotifications', { suppressErrors: true }),
      onNotificationDeleted: () => dispatch('reloadNotifications', { suppressErrors: true }),
    }));
  },
  async reloadNotifications({ state, commit }, { suppressErrors = false } = {}) {
    const authGeneration = state.authGeneration;
    try {
      const notifications = await fetchNotifications();
      if (state.authGeneration === authGeneration) replaceSnapshotSection(state, commit, 'notifications', notifications);
    } catch (error) {
      if (!suppressErrors && state.authGeneration === authGeneration) throw error;
    }
  },
};
