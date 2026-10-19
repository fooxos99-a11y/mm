import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const catalog = JSON.parse(await readFile(new URL('../../backend/resources/permissions/catalog.json', import.meta.url), 'utf8'));
const PERMISSION_GROUPS = catalog.groups;
const PERMISSION_ROLES = catalog.roles;

const source = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('permission definitions remain centralized and unique', () => {
  const keys = PERMISSION_GROUPS.flatMap((group) => group.permissions.map((permission) => permission.key));

  assert.equal(PERMISSION_ROLES.length, 2);
  assert.equal(keys.length, 31);
  assert.equal(new Set(keys).size, keys.length);
});

test('supervision delegates account management without exposing a manual permission editor', async () => {
  const [view, controller] = await Promise.all([
    source('../src/views/AdminPermissionsView.vue'),
    source('../src/features/permissions/adminPermissionsView.js'),
  ]);

  assert.match(view, /<DashboardAccountsPanel/);
  assert.doesNotMatch(view, /PermissionsMatrixPanel|permissions-search|permissions-status/);
  assert.match(controller, /DashboardAccountsPanel/);
  assert.doesNotMatch(controller, /loadPermissions|savePermissions/);
  assert.equal(view.includes('<v-switch'), false);
  assert.equal(view.includes('<style scoped>'), false);
});

test('assessment view reuses its course toolbar and document workspace', async () => {
  const [view, controller, toolbar, questionBuilder] = await Promise.all([
    source('../src/views/AdminAssessmentView.vue'),
    source('../src/features/assessment/adminAssessmentView.js'),
    source('../src/components/assessment/AssessmentCourseToolbar.vue'),
    source('../src/components/assessment/AssessmentQuestionBuilder.vue'),
  ]);

  for (const component of ['AssessmentCourseToolbar', 'AssessmentDocumentWorkspace']) {
    assert.match(view, new RegExp(`<${component}`));
    assert.match(controller, new RegExp(component));
  }

  assert.equal(view.includes('class="assessment-select-option"'), false);
  assert.equal(view.includes('<RichTextEditor'), false);
  assert.match(toolbar, /contentClass: 'assessment-course-menu'/);
  assert.match(toolbar, /#item-title="\{ item \}"/);
  assert.match(toolbar, /#item-actions="\{ item, actionAttrs \}"/);
  assert.match(questionBuilder, /#activator="\{ props \}"/);
  assert.equal(questionBuilder.includes('#activator="{ on, attrs }"'), false);
  assert.match(toolbar, /import \{ AppIconButton, AppInput,/);
  assert.match(toolbar, /\$emit\('edit-course', item.course\)/);
  assert.match(toolbar, /\$emit\('delete-course', item.course\)/);
  assert.equal(toolbar.includes('<AppRawButton'), false);
});
