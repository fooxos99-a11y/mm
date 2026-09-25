import { createStore as createVuexStore } from 'vuex';
import {
  authGetters,
  authMutations,
  createAuthState,
  createDashboardState,
  dashboardMutations,
} from './modules/storeState.mjs';
import { lazyDomainActions } from './modules/lazyDomainActions';

export const createStore = () => createVuexStore({
  state: {
    appName: 'Momars',
    apiBaseUrl: process.env.VUE_APP_API_BASE_URL || 'http://localhost:8000/api',
    ...createAuthState(),
    ...createDashboardState(),
  },
  getters: {
    ...authGetters,
  },
  mutations: {
    setApiBaseUrl(state, value) {
      state.apiBaseUrl = value;
    },
    ...authMutations,
    ...dashboardMutations,
  },
  actions: {
    ...lazyDomainActions,
  },
});

export default createStore();
