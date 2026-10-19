import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import courseSave from '../src/features/assessment/assessmentQuestionSaveMethods.js';
import templateSave from '../src/features/assessment/assessmentTemplateMethods.js';

const file = fileURLToPath(new URL('../src/features/assessment/adminAssessmentCourseComputed.js', import.meta.url));
const source = (await readFile(file, 'utf8')).replace(/from '([^']+)'/g, (_, specifier) => {
  let resolved = path.resolve(path.dirname(file), specifier);
  if (!path.extname(resolved)) resolved += '.js';
  return `from '${pathToFileURL(resolved).href}'`;
});
const { default: computed } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('task save compares link description points and actual document content with persisted values', () => {
  const context = { selectedCourse: { youtubeUrl: 'https://example.test', taskDescription: 'وصف', taskTemplateContent: '' },
    visibleSelectedQuestions: [], questionDrafts: {}, questionForms: [], pendingDeletedQuestionIds: [],
    selectedQuestions: [{ allowFile: true, points: 1 }], isTasksPage: true, isDocumentMode: true,
    taskPointsDraft: '1', template: '<p><br></p>', link: ' https://example.test ', description: 'وصف',
    normalizeTaskTemplateContent() { return this.template; }, normalizeTaskVideoUrl() { return this.link.trim(); },
    normalizeTaskDescription() { return this.description.trim(); } };
  const changed = () => computed.hasAssessmentChanges.call(context);
  assert.equal(changed(), false);
  for (const [key, value] of [['template', '<p>نص جديد</p>'], ['template', '<img src="test">'], ['template', '<table></table>'],
    ['link', 'https://example.test/new'], ['description', 'وصف جديد'], ['taskPointsDraft', '2']]) {
    const original = context[key];
    context[key] = value;
    assert.equal(changed(), true, key);
    context[key] = original;
    assert.equal(changed(), false, key);
  }
  context.selectedCourse.taskTemplateContent = context.template = '<p>نص</p>';
  assert.equal(changed(), false);
  context.template = '<p><strong>نص</strong></p>';
  assert.equal(changed(), true);
  context.selectedCourse = null;
  assert.equal(changed(), false);
});

test('save handlers reject unchanged state before sending any mutation', async () => {
  const context = { selectedCourse: { id: 'c' }, hasAssessmentChanges: false, hasQuestionChanges: false,
    syncCourseQuestions() { assert.fail('unchanged content must not be sent'); } };
  await courseSave.handleSaveAllQuestions.call(context);
  await templateSave.saveTemplate.call(context);
});
