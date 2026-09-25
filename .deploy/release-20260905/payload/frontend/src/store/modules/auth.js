import {
  fetchCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
} from '../../services/authApi';
import { cleanupDashboardRealtime } from '../realtimeLifecycle';
export {
  authGetters,
  authMutations,
  createAuthState,
} from './storeState.mjs';

export const authActions = {
  async bootstrapAuth({ state, commit }) {
    if (state.authChecked) return;

    commit('setAuthLoading', true);
    try {
      const user = await fetchCurrentUser();
      commit('setAuthState', { user });
    } catch (error) {
      if (error?.response?.status === 401) {
        commit('clearAuthState');
        commit('setAuthError', '');
      } else {
        commit('setAuthError', error?.response?.data?.message || 'تعذر التحقق من الجلسة الآن.');
      }
    } finally {
      commit('setAuthLoading', false);
      commit('setAuthChecked', true);
    }
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
    commit('clearAuthState');
    commit('setAuthChecked', true);
    commit('setAuthError', '');
    commit('setDashboardError', '');
    await Promise.all([request, cleanupDashboardRealtime()]);
  },
};
