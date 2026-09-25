import assert from 'node:assert/strict';
import test from 'node:test';
import {
  authGetters,
  authMutations,
  createAuthState,
  createDashboardState,
  dashboardMutations,
} from '../src/store/modules/storeState.mjs';

test('store state factories isolate auth and dashboard state', () => {
  const first = { ...createAuthState(), ...createDashboardState() };
  const second = { ...createAuthState(), ...createDashboardState() };
  first.currentUser = { id: 1 };
  first.dashboardSnapshot = { courses: [] };

  assert.equal(second.currentUser, null);
  assert.equal(second.dashboardSnapshot, null);
  assert.equal(authGetters.isAuthenticated(first), true);
  assert.equal(authGetters.isAuthenticated(second), false);
});

test('store mutations update lifecycle state and invalidate stale auth generations', () => {
  const state = { ...createAuthState(), ...createDashboardState() };
  authMutations.setAuthLoading(state, true);
  authMutations.setAuthChecked(state, true);
  authMutations.setAuthError(state, 'error');
  authMutations.setAuthState(state, { user: { id: 7 } });
  dashboardMutations.setDashboardLoading(state, true);
  dashboardMutations.setDashboardSnapshot(state, { courses: [1] });
  dashboardMutations.setDashboardError(state, 'dashboard-error');

  assert.deepEqual(state.currentUser, { id: 7 });
  assert.equal(state.authGeneration, 1);
  assert.equal(state.authLoading, true);
  assert.equal(state.authChecked, true);
  assert.equal(state.authError, 'error');
  assert.equal(state.dashboardLoading, true);
  assert.deepEqual(state.dashboardSnapshot, { courses: [1] });
  assert.equal(state.dashboardError, 'dashboard-error');

  authMutations.clearAuthState(state);
  assert.equal(state.currentUser, null);
  assert.equal(state.dashboardSnapshot, null);
  assert.equal(state.authGeneration, 2);
});
