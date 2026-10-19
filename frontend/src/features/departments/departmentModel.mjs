import { passwordMeetsPolicy } from '../../utils/passwordPolicy.mjs';

export const isSystemAdministrator = (user) => user?.role === 'super_admin' || user?.systemRole === 'super_admin';

export const createDepartmentForm = (department = {}) => ({
  name: department.name || '',
  managerTitle: department.managerTitle || '',
  managerLoginCode: department.manager?.loginCode || '',
  managerPassword: '',
  isActive: department.isActive !== false,
});

export const departmentFormIsValid = (form, originalLoginCode = '') => Boolean(
  String(form?.name || '').trim()
  && String(form?.managerTitle || '').trim()
  && String(form?.managerLoginCode || '').trim()
  && (originalLoginCode === String(form?.managerLoginCode).trim() || passwordMeetsPolicy(form?.managerPassword)),
);

const normalizedDepartmentForm = (form = {}) => ({
  name: String(form.name || '').trim(),
  managerTitle: String(form.managerTitle || '').trim(),
  managerLoginCode: String(form.managerLoginCode || '').trim(),
  isActive: form.isActive !== false,
});

export const departmentFormHasChanges = (form, original) => Boolean(original
  && JSON.stringify(normalizedDepartmentForm(form)) !== JSON.stringify(normalizedDepartmentForm(original)));

export const managementNavigation = Object.freeze([
  { id: 'overview', label: 'نظرة عامة', icon: 'mdi-view-dashboard-outline' },
  { id: 'departments', label: 'الإدارات', icon: 'mdi-bookshelf' },
  { id: 'indicators', label: 'المؤشرات الإجمالية', icon: 'mdi-chart-box-outline' },
  { id: 'archives', label: 'الأرشيف المركزي', icon: 'mdi-archive-outline' },
]);

export const resolveManagementSection = (section) => (
  managementNavigation.some(item => item.id === section) ? section : 'overview'
);

export const managementSectionQuery = (query, section) => {
  const next = { ...query, section: resolveManagementSection(section) };
  if (next.section !== 'indicators') delete next.departmentId;
  return next;
};
