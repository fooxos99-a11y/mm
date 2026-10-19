import { accountEditorErrors } from './accountEditorModel.mjs';

export const DASHBOARD_ACCOUNT_ROLE_OPTIONS = Object.freeze([
  { label: 'مشرف المعلمين', value: 'male_manager' },
  { label: 'مشرفة المعلمات', value: 'female_manager' },
  { label: 'مسؤول الإدارة', value: 'admin' },
]);

const ROLE_LABELS = Object.freeze(Object.fromEntries(
  DASHBOARD_ACCOUNT_ROLE_OPTIONS.map(({ label, value }) => [value, label]),
));

export const createEmptyDashboardAccountForm = () => ({
  role: 'male_manager',
  name: '',
  loginCode: '',
  password: '',
});

export const dashboardAccountFormIsValid = (form = {}) => Object.keys(accountEditorErrors(form)).length === 0;

export const resolveDashboardAccountRoleLabel = (role) => ROLE_LABELS[role] || role;
