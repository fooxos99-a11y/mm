import assert from 'node:assert/strict';
import test from 'node:test';
import { scopeCourseUpdates } from '../src/features/assessment/scopeCourseUpdates.mjs';
import { accountEditorChanged, accountEditorErrors } from '../src/features/dashboardAccounts/accountEditorModel.mjs';
import { canUseDashboardPermission } from '../src/features/permissions/permissionAccess.mjs';
import { accessDate, accessValue } from '../src/features/permissions/accessHistoryFormat.mjs';

test('supervisor course requests include only their operational branch and preserve shared content', () => {
  const updates = { title: 'دورة مشتركة', branchAvailability: { male: { pre: true }, female: { pre: false } },
    assessmentWindows: { global: { pre: 'old' }, male: { pre: 'new' }, female: { pre: 'keep' } } };
  assert.equal(scopeCourseUpdates(updates, 'admin'), updates);
  const male = scopeCourseUpdates(updates, 'male_manager');
  assert.equal(male.title, updates.title);
  assert.deepEqual(male.branchAvailability, { male: { pre: true } });
  assert.deepEqual(male.assessmentWindows, { male: { pre: 'new' } });
  assert.deepEqual(scopeCourseUpdates(updates, 'female_manager').branchAvailability, { female: { pre: false } });
  assert.deepEqual(scopeCourseUpdates({ title: 'عنوان' }, 'male_manager'), { title: 'عنوان' });
});

test('supervisor account creation and editing enforce scoped password rules and actual changes', () => {
  const baseline = { name: 'حساب إشرافي', loginCode: '1', role: 'male_manager', isActive: true, password: '' };
  assert.deepEqual(accountEditorErrors({ ...baseline, password: '12345678' }), {});
  assert.ok(accountEditorErrors({ ...baseline, password: '1' }).password);
  assert.ok(accountEditorErrors({ ...baseline, password: '        ' }).password);
  assert.ok(accountEditorErrors({ ...baseline, password: 'x'.repeat(256) }).password);
  assert.deepEqual(accountEditorErrors(baseline, true), {});
  assert.ok(accountEditorErrors({ ...baseline, password: 'short' }, true).password);
  assert.ok(accountEditorErrors({ ...baseline, name: 'قصير' }, true).name);
  assert.ok(accountEditorErrors({ ...baseline, name: 'x'.repeat(256) }, true).name);
  assert.ok(accountEditorErrors({ ...baseline, loginCode: '' }, true).loginCode);
  assert.ok(accountEditorErrors({ ...baseline, loginCode: 'x'.repeat(256) }, true).loginCode);
  assert.ok(accountEditorErrors({ ...baseline, role: 'super_admin' }, true).role);
  assert.equal(accountEditorChanged(baseline, baseline), false);
  assert.equal(accountEditorChanged({ ...baseline, name: 'اسم حساب جديد' }, baseline), true);
  assert.equal(accountEditorChanged({ ...baseline, password: '12345678' }, baseline), true);
});

test('view-only access requires explicit granular grants and admin access stays within its role', () => {
  const snapshot = { rolePermissions: { male_manager: { page_final_exam: true, edit_final_questions: false } } };
  assert.equal(canUseDashboardPermission({ role: 'male_manager' }, snapshot, 'page_final_exam'), true);
  assert.equal(canUseDashboardPermission({ role: 'male_manager' }, snapshot, 'edit_final_questions'), false);
  assert.equal(canUseDashboardPermission({ role: 'admin' }, snapshot, 'edit_final_questions'), true);
  assert.equal(canUseDashboardPermission(null, null, 'edit_final_questions'), false);
});

test('access history formats booleans roles missing logins and date values without exposing credentials', () => {
  assert.equal(accessValue(true), 'مفعّل'); assert.equal(accessValue(false), 'معطّل');
  assert.equal(accessValue('female_manager'), 'مشرفة المعلمات'); assert.equal(accessValue('note'), 'note');
  assert.equal(accessValue(null), ''); assert.equal(accessDate(null), 'غير مسجّل');
  assert.ok(accessDate('2026-10-19T00:00:00Z').length > 8);
});
