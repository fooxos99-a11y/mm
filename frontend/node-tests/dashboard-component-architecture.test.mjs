import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const dashboardViewUrl = new URL('../src/views/DashboardView.vue', import.meta.url);
const dashboardControllerUrl = new URL('../src/features/dashboard/dashboardView.js', import.meta.url);

test('dashboard view delegates topbar overview and management dialogs to components', async () => {
  const [view, controller] = await Promise.all([
    readFile(dashboardViewUrl, 'utf8'),
    readFile(dashboardControllerUrl, 'utf8'),
  ]);

  for (const component of ['DashboardTopbar', 'DashboardOverviewPanel', 'DashboardManagementDialogs']) {
    assert.match(view, new RegExp(`<${component}`));
    assert.match(controller, new RegExp(component));
  }

  assert.equal(view.includes('<header class="dashboard-topbar">'), false);
  assert.equal(view.includes('<AppDialog'), false);
  assert.equal(view.includes('dashboard-indicator-ring__svg'), false);
});
