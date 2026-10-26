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
  refreshDashboardSnapshot({ state, dispatch }, { background = false } = {}) {
    return dispatch('loadDashboardSnapshot', { mode: state.dashboardSnapshot?.snapshotMode === 'shell' ? 'shell' : 'full', background });
  },
  async loadDashboardSnapshot({ state, commit, dispatch }, { mode = 'full', background = false } = {}) {
    if (!state.currentUser) {
      commit('setDashboardSnapshot', null);
      commit('setDashboardError', '');
      return;
    }

    const authGeneration = state.authGeneration;
    const expectedUserId = state.currentUser.id;
    const requestId = (requests.get(state) || 0) + 1;
    requests.set(state, requestId);
    const isCurrent = () => state.authGeneration === authGeneration && requests.get(state) === requestId;
    if (!background) {
      commit('setDashboardLoading', true);
      commit('setDashboardError', '');
    }
    try {
      const snapshot = await (mode === 'shell' ? fetchDashboardShell() : fetchDashboardSnapshot());
      if (isCurrent()) commit('setDashboardSnapshot', snapshot);
      return isCurrent();
    } catch (error) {
      if (!isCurrent()) return false;
      if (error?.response?.status === 401) {
        const user = await dispatch('bootstrapAuth', { force: true });
        if (requests.get(state) !== requestId) return;
        if (user && user.id !== expectedUserId) { commit('setDashboardLoading', false); return; }
        if (user && state.authChecked) {
          const confirmedGeneration = state.authGeneration;
          try {
            const snapshot = await (mode === 'shell' ? fetchDashboardShell() : fetchDashboardSnapshot());
            if (state.authGeneration === confirmedGeneration && requests.get(state) === requestId) commit('setDashboardSnapshot', snapshot);
          } catch (retryError) {
            commit('setDashboardError', retryError?.response?.status === 401
              ? 'تعذر تحميل البيانات. أعد المحاولة.' : 'تعذر الاتصال. أعد المحاولة.');
          }
        } else {
          commit('setDashboardError', state.authChecked
            ? 'انتهت صلاحية الجلسة. سجّل الدخول مرة أخرى.' : state.authError);
        }
        commit('setDashboardLoading', false);
        return;
      }
      if (!background) commit('setDashboardError', error?.response?.data?.message || error?.message || 'تعذر تحميل بيانات لوحة التحكم.');
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
    if (!state.currentUser || ['unassigned', 'super_admin'].includes(state.currentUser.role) || (state.currentUser.role !== 'student' && state.currentUser.mustChangePassword)) return Promise.resolve();
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
