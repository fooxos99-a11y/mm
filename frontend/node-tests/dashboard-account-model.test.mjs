import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createEmptyDashboardAccountForm,
  dashboardAccountFormIsValid,
  resolveDashboardAccountRoleLabel,
} from '../src/features/dashboardAccounts/accountModel.mjs';

test('dashboard account form factory returns an isolated default form', () => {
  const first = createEmptyDashboardAccountForm();
  const second = createEmptyDashboardAccountForm();

  first.name = 'Changed';

  assert.equal(second.name, '');
  assert.equal(second.role, 'male_manager');
});

test('dashboard account validation applies identity role and password rules', () => {
  assert.equal(dashboardAccountFormIsValid({
    role: 'female_manager',
    name: 'مشرفة جديدة',
    loginCode: '5002',
    password: 'Secure-password-5002',
  }), true);

  assert.equal(dashboardAccountFormIsValid({
    role: 'unknown',
    name: 'مشرفة جديدة',
    loginCode: '5002',
    password: 'Secure-password-5002',
  }), false);
});

test('dashboard account role labels are centralized with a safe fallback', () => {
  assert.equal(resolveDashboardAccountRoleLabel('admin'), 'مدير النمو المهني');
  assert.equal(resolveDashboardAccountRoleLabel('custom'), 'custom');
});
