export const createAuthState = () => ({
  currentUser: null,
  authGeneration: 0,
  authLoading: false,
  authChecked: false,
  authError: '',
});

export const createDashboardState = () => ({
  dashboardSnapshot: null,
  dashboardLoading: false,
  dashboardError: '',
});

export const authGetters = {
  isAuthenticated: (state) => Boolean(state.currentUser),
};

export const authMutations = {
  setAuthLoading(state, value) { state.authLoading = value; },
  setAuthChecked(state, value) { state.authChecked = value; },
  setAuthError(state, value) { state.authError = value; },
  setAuthState(state, { user }) {
    state.currentUser = user;
    state.authGeneration += 1;
  },
  clearAuthState(state) {
    state.currentUser = null;
    state.dashboardSnapshot = null;
    state.authGeneration += 1;
  },
};

export const dashboardMutations = {
  setDashboardLoading(state, value) { state.dashboardLoading = value; },
  setDashboardSnapshot(state, value) { state.dashboardSnapshot = value; },
  setDashboardError(state, value) { state.dashboardError = value; },
};
