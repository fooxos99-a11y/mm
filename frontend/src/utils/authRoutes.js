const DASHBOARD_ROLES = new Set(['admin', 'male_manager', 'female_manager']);

export const canUseDashboard = (role) => DASHBOARD_ROLES.has(role);

export const resolveUserHomeRoute = (user) => {
  const role = user?.role || '';

  if (role === 'super_admin') return { name: 'system-management' };
  if (role === 'unassigned') return { name: 'account-assignment' };

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

  if (role === 'super_admin') return 'إدارة النظام';
  if (role === 'unassigned') return 'حسابي';

  if (canUseDashboard(role)) {
    return 'لوحة التحكم';
  }

  if (role === 'reciter') {
    return 'لوحة المقرئ';
  }

  return 'حسابي';
};

// Only accept routes within this application, never external or recursive login URLs.
export const resolveLoginDestination = (router, redirect, user) => {
  if (typeof redirect === 'string' && redirect.startsWith('/')
    && !redirect.startsWith('//') && !redirect.includes('\\') && !Array.from(redirect).some((char) => char.codePointAt(0) < 32)) {
    const target = router.resolve(redirect);
    if (target.matched.length && !['login', 'not-found'].includes(target.name)
      && target.query.login !== '1') return target.fullPath;
  }
  return resolveUserHomeRoute(user);
};
