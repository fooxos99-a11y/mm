let authenticatedDepartmentId = null;

export const setAuthenticatedDepartment = (user) => {
  authenticatedDepartmentId = user?.departmentId || user?.selectedDepartmentId || null;
};

export const publicDepartmentParams = (departmentId) => {
  const fromQuery = typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('departmentId');
  const selected = departmentId || authenticatedDepartmentId || fromQuery;
  return selected ? { departmentId: selected } : {};
};
