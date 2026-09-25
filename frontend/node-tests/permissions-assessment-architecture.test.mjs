import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PERMISSION_GROUPS, PERMISSION_ROLES } from '../src/features/permissions/permissionGroups.js';

const source = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('permission definitions remain centralized and unique', () => {
  const keys = PERMISSION_GROUPS.flatMap((group) => group.permissions.map((permission) => permission.key));

  assert.equal(PERMISSION_ROLES.length, 2);
  assert.equal(keys.length, 26);
  assert.equal(new Set(keys).size, keys.length);
});

test('permissions view delegates the matrix and keeps styles external', async () => {
  const [view, controller] = await Promise.all([
    source('../src/views/AdminPermissionsView.vue'),
    source('../src/features/permissions/adminPermissionsView.js'),
  ]);

  assert.match(view, /<PermissionsMatrixPanel/);
  assert.match(controller, /PermissionsMatrixPanel/);
  assert.equal(view.includes('<v-switch'), false);
  assert.equal(view.includes('<style scoped>'), false);
});

test('assessment view reuses its course toolbar and document workspace', async () => {
  const [view, controller, toolbar, questionBuilder, toolbarStyles] = await Promise.all([
    source('../src/views/AdminAssessmentView.vue'),
    source('../src/features/assessment/adminAssessmentView.js'),
    source('../src/components/assessment/AssessmentCourseToolbar.vue'),
    source('../src/components/assessment/AssessmentQuestionBuilder.vue'),
    source('../src/styles/views/admin-assessment.css'),
  ]);

  for (const component of ['AssessmentCourseToolbar', 'AssessmentDocumentWorkspace']) {
    assert.match(view, new RegExp(`<${component}`));
    assert.match(controller, new RegExp(component));
  }

  assert.equal(view.includes('class="assessment-select-option"'), false);
  assert.equal(view.includes('<RichTextEditor'), false);
  assert.match(toolbar, /contentClass: 'assessment-course-menu'/);
  assert.match(toolbar, /assessment-select-option--create/);
  assert.match(questionBuilder, /#activator="\{ props \}"/);
  assert.equal(questionBuilder.includes('#activator="{ on, attrs }"'), false);
  assert.match(toolbarStyles, /\.assessment-select-option__delete[\s\S]*?width: 44px;[\s\S]*?height: 44px;/);
});
