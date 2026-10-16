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
