import assert from 'node:assert/strict';
import test from 'node:test';
import navigationMethods from '../src/features/dashboard/dashboardNavigationMethods.js';
import dashboardAccess from '../src/features/dashboard/dashboardAccessComputed.js';

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


test('system management navigation appears only for the general manager', () => {
  const menuFor = currentUser => dashboardAccess.dashboardMenu.call({ currentUser, canAccessPanel: () => true });
  assert.equal(menuFor({ role: 'admin', systemRole: 'super_admin' }).at(-1).id, 'system-management');
  assert.equal(menuFor({ role: 'admin' }).some(item => item.id === 'system-management'), false);
  assert.equal(menuFor({ role: 'student' }).some(item => item.id === 'system-management'), false);
});

test('dashboard query accepts panels while rejecting system actions and unknown identifiers', () => {
  const dashboardMenu = dashboardAccess.dashboardMenu.call({
    currentUser: { role: 'admin', systemRole: 'super_admin' },
    canAccessPanel: () => true,
  });
  const context = { dashboardMenu };
  assert.equal(dashboardMenu.find(item => item.id === 'system-management')?.mode, 'system');
  assert.equal(navigationMethods.normalizeDashboardPanel.call(context, ' Courses '), 'courses');
  assert.equal(navigationMethods.normalizeDashboardPanel.call(context, 'system-management'), '');
  assert.equal(navigationMethods.normalizeDashboardPanel.call(context, 'unknown-panel'), '');
});

test('general manager returns through the existing menu and clears the department context', async () => {
  const events = [];
  const context = createContext({
    currentUser: { role: 'admin', systemRole: 'super_admin' },
    $store: { dispatch: async (...args) => events.push(['dispatch', ...args]) },
    $router: { push: async target => events.push(['route', target]) },
    returnToSystemManagement: navigationMethods.returnToSystemManagement,
  });
  await navigationMethods.handleMenu.call(context, { id: 'system-management' });
  assert.deepEqual(events, [['dispatch', 'selectDepartmentContext', null], ['route', { name: 'system-management' }]]);
  assert.equal(context.mobileMenuOpen, false);
  assert.equal(context.panelLoading, false);
});

test('returning to system management preserves rejected drafts and unauthorized contexts', async () => {
  let requests = 0;
  const context = createContext({
    activeMenu: 'courses',
    currentUser: { role: 'admin', systemRole: 'super_admin' },
    $refs: { workspacePanel: { confirmDiscardChanges: async () => false } },
    $store: { dispatch: async () => { requests++; } },
  });
  await navigationMethods.returnToSystemManagement.call(context);
  assert.equal(requests, 0);
  assert.equal(context.mobileMenuOpen, true);
  context.currentUser = { role: 'admin' };
  await navigationMethods.returnToSystemManagement.call(context);
  assert.equal(requests, 0);
});

test('failed context changes keep the current page available for retry', async () => {
  const errors = [];
  const context = createContext({
    currentUser: { role: 'admin', systemRole: 'super_admin' },
    $store: { dispatch: async () => { throw new Error('network'); } },
    $router: { push: async () => { throw new Error('unexpected navigation'); } },
    $toast: { error: message => errors.push(message) },
  });
  await navigationMethods.returnToSystemManagement.call(context);
  assert.deepEqual(errors, ['تعذر العودة إلى إدارة النظام.']);
  assert.equal(context.mobileMenuOpen, true);
  assert.equal(context.panelLoading, false);
});
