export const isSystemAdministrator = (user) => user?.role === 'super_admin' || user?.systemRole === 'super_admin';

export const createDepartmentForm = (department = {}) => ({
  name: department.name || '',
  managerTitle: department.managerTitle || 'مسؤول الإدارة',
  managerLoginCode: department.manager?.loginCode || '',
  isActive: department.isActive !== false,
});

export const canAssignDepartmentAccount = (account, departmentId) => Boolean(account)
  && ['unassigned', 'admin'].includes(account.role)
  && (!account.departmentId || String(account.departmentId) === String(departmentId || ''));

export const departmentFormIsValid = (form, account, departmentId) => Boolean(
  String(form?.name || '').trim()
  && String(form?.managerTitle || '').trim()
  && String(form?.managerLoginCode || '').trim()
  && String(account?.loginCode) === String(form?.managerLoginCode).trim()
  && canAssignDepartmentAccount(account, departmentId),
);
