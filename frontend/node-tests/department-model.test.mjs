import assert from 'node:assert/strict';
import test from 'node:test';
import { canAssignDepartmentAccount, createDepartmentForm, departmentFormIsValid, isSystemAdministrator } from '../src/features/departments/departmentModel.mjs';
import { publicDepartmentParams, setAuthenticatedDepartment } from '../src/services/departmentContext.js';
import { resolveUserHomeLabel, resolveUserHomeRoute } from '../src/utils/authRoutes.js';

test('department forms isolate defaults and preserve the selected responsible account', () => {
  const first = createDepartmentForm();
  first.name = 'changed';
  assert.deepEqual(createDepartmentForm(), { name: '', managerTitle: 'مسؤول الإدارة', managerLoginCode: '', isActive: true });
  assert.deepEqual(createDepartmentForm({ name: 'أ', managerTitle: 'مدير التدريب', manager: { loginCode: '1483' }, isActive: false }), { name: 'أ', managerTitle: 'مدير التدريب', managerLoginCode: '1483', isActive: false });
});

test('only an available verified account can become the department manager', () => {
  const form = { name: 'الإدارة الأولى', managerTitle: 'مدير التدريب', managerLoginCode: '1483' };
  const candidate = { id: 1, name: 'مسؤول الإدارة', loginCode: '1483', role: 'unassigned' };
  assert.equal(departmentFormIsValid(form, candidate), true);
  assert.equal(departmentFormIsValid(form, { ...candidate, departmentId: 'other' }, 'current'), false);
  assert.equal(departmentFormIsValid(form, { ...candidate, departmentId: 'current' }, 'current'), true);
  assert.equal(departmentFormIsValid({ ...form, managerLoginCode: '1484' }, candidate), false);
  assert.equal(departmentFormIsValid({ ...form, name: '' }, candidate), false);
  assert.equal(departmentFormIsValid({ ...form, managerTitle: '' }, candidate), false);
  assert.equal(departmentFormIsValid({ ...form, managerLoginCode: '' }, candidate), false);
  assert.equal(departmentFormIsValid(), false);
  assert.equal(departmentFormIsValid({}, {}), false);
  assert.equal(canAssignDepartmentAccount({ ...candidate, role: 'super_admin' }), false);
  assert.equal(canAssignDepartmentAccount(null), false);
  assert.equal(canAssignDepartmentAccount({ departmentId: 'other' }), false);
});

test('one login routes each system role to its own workspace', () => {
  assert.equal(isSystemAdministrator({ role: 'super_admin' }), true);
  assert.equal(isSystemAdministrator({ role: 'admin', systemRole: 'super_admin' }), true);
  assert.equal(isSystemAdministrator({ role: 'admin' }), false);
  assert.equal(isSystemAdministrator(), false);
  assert.deepEqual(resolveUserHomeRoute({ role: 'super_admin' }), { name: 'system-management' });
  assert.deepEqual(resolveUserHomeRoute({ role: 'unassigned' }), { name: 'account-assignment' });
  assert.equal(resolveUserHomeLabel({ role: 'super_admin' }), 'إدارة النظام');
  assert.equal(resolveUserHomeLabel({ role: 'unassigned' }), 'حسابي');
});

test('public requests use explicit or authenticated department without persistent storage', () => {
  delete globalThis.window;
  setAuthenticatedDepartment(null);
  assert.deepEqual(publicDepartmentParams(), {});
  assert.deepEqual(publicDepartmentParams('a'), { departmentId: 'a' });
  globalThis.window = { location: { search: '?departmentId=b' } };
  assert.deepEqual(publicDepartmentParams(), { departmentId: 'b' });
  setAuthenticatedDepartment({ departmentId: 'a' });
  assert.deepEqual(publicDepartmentParams(), { departmentId: 'a' });
  assert.deepEqual(publicDepartmentParams('c'), { departmentId: 'c' });
  setAuthenticatedDepartment({ selectedDepartmentId: 'selected' });
  assert.deepEqual(publicDepartmentParams(), { departmentId: 'selected' });
  setAuthenticatedDepartment(null);
  delete globalThis.window;
});
