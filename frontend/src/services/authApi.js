import apiClient, { initializeCsrfProtection, withSessionMutation } from './httpClient';
import { setAuthenticatedDepartment } from './departmentContext';

const STORAGE_NAMESPACE = process.env.VUE_APP_STORAGE_NAMESPACE || 'momars-practitioner';
const LEGACY_AUTH_STORAGE_KEYS = [
  'momars.authToken',
  `${STORAGE_NAMESPACE}.authToken`,
  `${STORAGE_NAMESPACE}.authUser`,
];

let sessionGeneration = 0;

export const applyApiUserContext = (user) => {
  const departmentId = user?.departmentId || user?.selectedDepartmentId;
  if (departmentId) apiClient.defaults.headers.common['X-Department-Id'] = departmentId;
  else delete apiClient.defaults.headers.common['X-Department-Id'];
  setAuthenticatedDepartment(user);
  sessionGeneration += 1;
};

const clearLegacyAuthStorage = () => {
  if (typeof window === 'undefined') {
    return;
  }

  LEGACY_AUTH_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
};

const clearVolatileToken = () => {
  delete apiClient.defaults.headers.common.Authorization;
};

clearLegacyAuthStorage();

export const currentAuthRequestKey = () => `session-${sessionGeneration}`;

export const fetchCurrentUser = async () => {
  const response = await apiClient.get('/auth/session');

  const user = response.data?.user || null;
  return user;
};

export const login = async ({ loginCode, password }) => {
  const response = await withSessionMutation(async () => {
    await initializeCsrfProtection({ sessionMutation: true });
    return apiClient.post('/auth/login', {
      login_code: loginCode,
      password,
    }, { sessionMutation: true });
  });

  clearLegacyAuthStorage();
  clearVolatileToken();

  // Non-browser API clients may still receive a short-lived bearer token.
  // Keep it only in memory so an XSS cannot recover it from persistent storage.
  if (response.data?.token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${response.data.token}`;
  }

  sessionGeneration += 1;

  const user = response.data?.user || await fetchCurrentUser();
  applyApiUserContext(user);
  return user;
};

export const logout = async () => {
  try {
    await withSessionMutation(() => apiClient.post('/auth/logout', undefined, { sessionMutation: true }));
  } finally {
    clearVolatileToken();
    clearLegacyAuthStorage();
    applyApiUserContext(null);
  }
};

export const updatePassword = async (payload) => {
  const response = await withSessionMutation(async () => {
    await initializeCsrfProtection({ sessionMutation: true });
    return apiClient.put('/auth/password', payload, { sessionMutation: true });
  });

  return response.data;
};

export const registerAccount = async (payload) => {
  await initializeCsrfProtection();
  const response = await apiClient.post('/auth/register-account', payload);
  return response.data;
};
