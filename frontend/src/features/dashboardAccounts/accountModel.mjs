import { passwordMeetsPolicy } from '../../utils/passwordPolicy.mjs';

export const DASHBOARD_ACCOUNT_ROLE_OPTIONS = Object.freeze([
  { label: 'مشرف معلمين', value: 'male_manager' },
  { label: 'مشرف معلمات', value: 'female_manager' },
  { label: 'مدير النمو المهني', value: 'admin' },
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

export const dashboardAccountFormIsValid = (form = {}) => (
  String(form.name || '').trim().length >= 6
  && Boolean(String(form.loginCode || '').trim())
  && passwordMeetsPolicy(form.password)
  && DASHBOARD_ACCOUNT_ROLE_OPTIONS.some(({ value }) => value === form.role)
);

export const resolveDashboardAccountRoleLabel = (role) => ROLE_LABELS[role] || role;
