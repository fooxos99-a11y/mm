import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const viewUrl = new URL('../src/views/AdminCommunicationsView.vue', import.meta.url);
const controllerUrl = new URL('../src/features/controllers/AdminCommunicationsView.js', import.meta.url);

test('notifications view delegates recipient preparation', async () => {
  const [view, controller] = await Promise.all([
    readFile(viewUrl, 'utf8'),
    readFile(controllerUrl, 'utf8'),
  ]);

  assert.match(view, /<NotificationPrepPanel/);
  assert.match(controller, /NotificationPrepPanel/);

  assert.equal(view.includes('class="prep-table"'), false);
  assert.equal(view.includes('سجل النشاط'), false);
});
