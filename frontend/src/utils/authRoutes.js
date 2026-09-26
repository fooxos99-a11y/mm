const DASHBOARD_ROLES = new Set(['admin', 'male_manager', 'female_manager']);

export const canUseDashboard = (role) => DASHBOARD_ROLES.has(role);

export const resolveUserHomeRoute = (user) => {
  const role = user?.role || '';

  if (canUseDashboard(role)) {
    return { name: 'dashboard' };
  }

  if (role === 'reciter') {
    return { name: 'reciter' };
  }

  if (role === 'student') {
    return { name: 'student' };
  }

  if (role === 'trainee') {
    return { name: 'trainee' };
  }

  return { name: 'home' };
};

export const resolveUserHomeLabel = (user) => {
  const role = user?.role || '';

  if (canUseDashboard(role)) {
    return 'لوحة التحكم';
  }

  if (role === 'reciter') {
    return 'لوحة المقرئ';
  }

  return 'حسابي';
};
