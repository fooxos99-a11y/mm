export const MANAGER_ROLES = ['male_manager', 'female_manager'];

export const getRolePermissions = (user, snapshot) => (
  MANAGER_ROLES.includes(user?.role) ? snapshot?.rolePermissions?.[user.role] || {} : {}
);

export const hasOneOfPermissions = (keys, user, snapshot) => (
  Array.isArray(keys)
  && keys.length > 0
  && keys.some((key) => getRolePermissions(user, snapshot)[key] === true)
);

export const canAccessDashboard = (user) => (
  user?.role === 'admin' || MANAGER_ROLES.includes(user?.role)
);

export const canAccessAdminRoute = (to, user, snapshot) => {
  if (user?.role === 'admin') return true;
  if (!MANAGER_ROLES.includes(user?.role)) return false;

  const allowed = (keys) => hasOneOfPermissions(keys, user, snapshot);
  switch (to.name) {
    case 'dashboard': return true;
    case 'admin-assessment':
      return to.params.assessmentType === 'pre'
        ? allowed(['edit_pre_questions', 'open_pre_exam'])
        : allowed(['edit_post_questions', 'open_post_exam']);
    case 'admin-people':
      return allowed(['add_student', 'delete_student', 'edit_student', 'add_reciter', 'delete_reciter', 'edit_reciter', 'transfer_reciter_student']);
    case 'admin-communications': return allowed(['page_notifications']);
    case 'admin-results': return allowed(['page_results']);
    case 'admin-final-exam': return false;
    default: return canAccessDashboard(user);
  }
};

export const resolveRedirectPath = (route) => {
  const fullPath = route?.fullPath || '';
  return !fullPath || fullPath === '/' || fullPath.startsWith('/login') ? '' : fullPath;
};

const trimQueryValue = (value) => (typeof value === 'string' ? value.trim() : '');

export const buildDashboardQuery = (panel, extras = {}) => {
  const query = panel && panel !== 'overview' ? { panel } : {};
  Object.entries(extras).forEach(([key, value]) => {
    const normalized = trimQueryValue(value);
    if (normalized) query[key] = normalized;
  });
  return query;
};
