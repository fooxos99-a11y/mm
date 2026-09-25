import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const studentViewUrl = new URL('../src/views/StudentView.vue', import.meta.url);
const studentControllerUrl = new URL('../src/features/student/studentView.js', import.meta.url);

test('student result details are rendered through the shared component', async () => {
  const [view, controller] = await Promise.all([
    readFile(studentViewUrl, 'utf8'),
    readFile(studentControllerUrl, 'utf8'),
  ]);

  assert.equal(view.match(/<StudentResultEntry/g)?.length, 4);
  assert.equal(view.includes('results-answer-card'), false);
  assert.match(controller, /StudentResultEntry/);
  assert.equal(controller.includes('RichTextDocumentView'), false);
  assert.equal(controller.includes('AppRawButton'), false);
});
