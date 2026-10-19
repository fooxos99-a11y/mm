export const canUseDashboardPermission = (user, snapshot, key) => {
  if (user?.role === 'admin') return true;
  const values = snapshot?.rolePermissions?.[user?.role] || {};
  return values[key] === true;
};
