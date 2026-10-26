import {
  applyApiUserContext,
  fetchCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
} from '../../services/authApi';
import { updateDepartmentContext } from '../../services/managementApi';
import { cleanupDashboardRealtime } from '../realtimeLifecycle';
export {
  authGetters,
  authMutations,
  createAuthState,
} from './storeState.mjs';

const sessionRequests = new WeakMap();

const fetchSessionUser = async () => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try { return await fetchCurrentUser(); } catch (error) {
      const status = error?.response?.status;
      if (status === 401) return null;
      const retryable = !status || status >= 500 || [408, 429].includes(status);
      if (!retryable || attempt === 1) throw error;
    }
  }
};


export const authActions = {
  async selectDepartmentContext({ commit }, departmentId) {
    const payload = await updateDepartmentContext(departmentId);
    await cleanupDashboardRealtime();
    applyApiUserContext(payload.user);
    commit('setDashboardSnapshot', null);
    commit('setDashboardLoading', false);
    commit('setDashboardError', '');
    commit('setAuthState', { user: payload.user });
  },
  async bootstrapAuth({ state, commit }, { force = false } = {}) {
    if (sessionRequests.has(state)) return sessionRequests.get(state);
    if (state.authChecked && !force) return state.currentUser;
    const generation = state.authGeneration;
    const isCurrent = () => state.authGeneration === generation;
    commit('setAuthLoading', true);
    const request = (async () => {
      try {
        const user = await fetchSessionUser();
        if (!isCurrent()) return state.currentUser;
        applyApiUserContext(user);
        if (!user) commit('clearAuthState');
        else {
          if (state.currentUser?.id !== user.id) commit('setDashboardSnapshot', null);
          commit('setAuthState', { user });
        }
        commit('setAuthChecked', true);
        commit('setAuthError', '');
        return user;
      } catch {
        if (isCurrent()) {
          commit('setAuthChecked', false);
          commit('setAuthError', 'تعذر التحقق من الجلسة. تحقق من الاتصال وحاول مرة أخرى.');
        }
        return undefined;
      } finally {
        sessionRequests.delete(state);
        commit('setAuthLoading', false);
      }
    })();
    sessionRequests.set(state, request);
    return request;
  },
  async login({ commit }, credentials) {
    commit('setAuthLoading', true);
    commit('setAuthError', '');
    try {
      const user = await loginRequest(credentials);
      commit('setAuthState', { user });
      commit('setAuthChecked', true);
    } catch (error) {
      const message = error?.response?.data?.errors?.login_code?.[0]
        || error?.response?.data?.message
        || 'تعذر تسجيل الدخول.';
      commit('setAuthError', message);
      throw error;
    } finally {
      commit('setAuthLoading', false);
    }
  },
  async logout({ commit }) {
    const request = logoutRequest().catch(() => {});
    applyApiUserContext(null);
    commit('clearAuthState');
    commit('setAuthChecked', true);
    commit('setAuthError', '');
    commit('setDashboardError', '');
    await Promise.all([request, cleanupDashboardRealtime()]);
  },
};
