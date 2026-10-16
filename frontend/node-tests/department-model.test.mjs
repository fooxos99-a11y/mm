import assert from 'node:assert/strict';
import test from 'node:test';
import { createDepartmentForm, departmentFormIsValid, isSystemAdministrator } from '../src/features/departments/departmentModel.mjs';
import { publicDepartmentParams, setAuthenticatedDepartment } from '../src/services/departmentContext.js';
import { resolveUserHomeLabel, resolveUserHomeRoute } from '../src/utils/authRoutes.js';

test('department forms isolate defaults and preserve the selected responsible account', () => {
  const first = createDepartmentForm();
  first.name = 'changed';
  assert.deepEqual(createDepartmentForm(), { name: '', managerTitle: '', managerLoginCode: '', managerPassword: '', isActive: true });
  assert.deepEqual(createDepartmentForm({ name: 'أ', managerTitle: 'مدير التدريب', manager: { loginCode: '1483' }, isActive: false }), { name: 'أ', managerTitle: 'مدير التدريب', managerLoginCode: '1483', managerPassword: '', isActive: false });
});

test('creating a department requires new credentials while editing preserves the same account', () => {
  const form = { name: 'الإدارة الأولى', managerTitle: 'مدير التدريب', managerLoginCode: '1483' };
  assert.equal(departmentFormIsValid(form), false);
  assert.equal(departmentFormIsValid({ ...form, managerPassword: '12345678' }), true);
  assert.equal(departmentFormIsValid({ ...form, managerPassword: '1234' }), false);
  assert.equal(departmentFormIsValid(form, '1483'), true);
  assert.equal(departmentFormIsValid({ ...form, managerLoginCode: '1484' }, '1483'), false);
  assert.equal(departmentFormIsValid({ ...form, name: '' }, '1483'), false);
  assert.equal(departmentFormIsValid({ ...form, managerTitle: '' }, '1483'), false);
  assert.equal(departmentFormIsValid({ ...form, managerLoginCode: '' }, '1483'), false);
  assert.equal(departmentFormIsValid(), false);
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
