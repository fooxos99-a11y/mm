import assert from 'node:assert/strict';
import test from 'node:test';
import navigationMethods from '../src/features/dashboard/dashboardNavigationMethods.js';

const createContext = (overrides = {}) => ({
  activeMenu: 'overview',
  assessmentTopbarState: {},
  dashboardError: '',
  dashboardSnapshot: { students: [] },
  mobileMenuOpen: true,
  panelLoading: false,
  loadCount: 0,
  async loadDashboardSnapshot() {
    this.loadCount += 1;
    this.dashboardSnapshot = { students: [] };
  },
  async ensureDashboardSnapshot({ mode = 'full' } = {}) {
    this.requestedMode = mode;
    if (!this.dashboardSnapshot || (mode === 'full' && this.dashboardSnapshot.snapshotMode === 'shell')) {
      await this.loadDashboardSnapshot();
    }
    return true;
  },
  syncDashboardStateFromRoute() {},
  ...overrides,
});

test('dashboard initialization reuses an existing snapshot', async () => {
  let syncCount = 0;
  const context = createContext({
    syncDashboardStateFromRoute() {
      syncCount += 1;
    },
  });

  await navigationMethods.initializeDashboard.call(context);

  assert.equal(context.loadCount, 0);
  assert.equal(syncCount, 1);
  assert.equal(context.panelLoading, false);
});

test('dashboard initialization loads a missing snapshot once', async () => {
  const context = createContext({ dashboardSnapshot: null });

  await navigationMethods.initializeDashboard.call(context);

  assert.equal(context.loadCount, 1);
  assert.equal(context.panelLoading, false);
});

test('switching dashboard panels does not reload an existing snapshot', async () => {
  const context = createContext();

  await navigationMethods.openPanel.call(context, 'users');

  assert.equal(context.loadCount, 0);
  assert.equal(context.activeMenu, 'users');
  assert.equal(context.mobileMenuOpen, false);
  assert.equal(context.panelLoading, false);
});

test('opening a panel loads the snapshot when it is missing', async () => {
  const context = createContext({ dashboardSnapshot: null });

  await navigationMethods.openPanel.call(context, 'courses');

  assert.equal(context.loadCount, 1);
  assert.equal(context.activeMenu, 'courses');
  assert.equal(context.panelLoading, false);
});

test('users need only the shell while legacy panels request complete data', async () => {
  const context = createContext({ dashboardSnapshot: { snapshotMode: 'shell' } });
  await navigationMethods.openPanel.call(context, 'users');
  assert.equal(context.requestedMode, 'shell');
  assert.equal(context.loadCount, 0);
  await navigationMethods.openPanel.call(context, 'courses');
  assert.equal(context.requestedMode, 'full');
  assert.equal(context.loadCount, 1);
});

test('failed loading preserves the current panel and permits retry', async () => {
  const context = createContext({ ensureDashboardSnapshot: async () => false });
  await navigationMethods.openPanel.call(context, 'courses');
  assert.equal(context.activeMenu, 'overview');
  assert.equal(context.panelLoading, false);
});

test('direct legacy links await data before mounting the panel', async () => {
  let finish;
  const context = createContext({
    dashboardSnapshot: { snapshotMode: 'shell' },
    $route: { name: 'dashboard' }, routeWorkspacePanel: 'courses',
    ensureDashboardSnapshot: () => new Promise((resolve) => { finish = resolve; }),
  });
  const loading = navigationMethods.syncDashboardStateFromRoute.call(context);
  assert.equal(context.panelLoading, true);
  assert.equal(context.activeMenu, 'overview');
  finish(true);
  await loading;
  assert.equal(context.activeMenu, 'courses');
  assert.equal(context.panelLoading, false);
});

test('a changed route cannot be overwritten by an older loading result', async () => {
  let finish;
  const context = createContext({
    dashboardSnapshot: { snapshotMode: 'shell' },
    $route: { name: 'dashboard' }, routeWorkspacePanel: 'courses',
    ensureDashboardSnapshot: () => new Promise((resolve) => { finish = resolve; }),
  });
  const loading = navigationMethods.syncDashboardStateFromRoute.call(context);
  context.routeWorkspacePanel = 'users';
  finish(true);
  await loading;
  assert.equal(context.activeMenu, 'overview');
});
