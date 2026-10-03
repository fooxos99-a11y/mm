import apiClient, { initializeCsrfProtection } from './httpClient';

const STORAGE_NAMESPACE = process.env.VUE_APP_STORAGE_NAMESPACE || 'momars-practitioner';
const LEGACY_AUTH_STORAGE_KEYS = [
  'momars.authToken',
  `${STORAGE_NAMESPACE}.authToken`,
  `${STORAGE_NAMESPACE}.authUser`,
];

let sessionGeneration = 0;

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

  return response.data?.user || null;
};

export const login = async ({ loginCode, password }) => {
  await initializeCsrfProtection();

  const response = await apiClient.post('/auth/login', {
    login_code: loginCode,
    password,
  });

  clearLegacyAuthStorage();
  clearVolatileToken();

  // Non-browser API clients may still receive a short-lived bearer token.
  // Keep it only in memory so an XSS cannot recover it from persistent storage.
  if (response.data?.token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${response.data.token}`;
  }

  sessionGeneration += 1;

  return response.data?.user || fetchCurrentUser();
};

export const logout = async () => {
  try {
    await apiClient.post('/auth/logout');
  } finally {
    clearVolatileToken();
    clearLegacyAuthStorage();
    sessionGeneration += 1;
  }
};

export const updatePassword = async (payload) => {
  await initializeCsrfProtection();

  const response = await apiClient.put('/auth/password', payload);

  return response.data;
};
