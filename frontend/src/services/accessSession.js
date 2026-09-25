const STORAGE_NAMESPACE = process.env.VUE_APP_STORAGE_NAMESPACE || 'momars-practitioner';
const ACCESS_SESSION_STORAGE_KEY = `${STORAGE_NAMESPACE}.studentAccess`;
const LEGACY_ACCESS_SESSION_STORAGE_KEY = 'momars.studentAccess';

const migrateLegacyStorageKey = () => {
  if (typeof window === 'undefined' || window.localStorage.getItem(ACCESS_SESSION_STORAGE_KEY)) {
    return;
  }

  const legacySession = window.localStorage.getItem(LEGACY_ACCESS_SESSION_STORAGE_KEY);
  if (legacySession) {
    window.localStorage.setItem(ACCESS_SESSION_STORAGE_KEY, legacySession);
  }
};

migrateLegacyStorageKey();

export const loadAccessSession = () => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(ACCESS_SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveAccessSession = (session) => {
  if (typeof window === 'undefined') return;

  if (!session) {
    window.localStorage.removeItem(ACCESS_SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(ACCESS_SESSION_STORAGE_KEY, JSON.stringify(session));
};

export const clearAccessSession = () => {
  if (typeof window === 'undefined') return;

  window.localStorage.removeItem(ACCESS_SESSION_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_ACCESS_SESSION_STORAGE_KEY);
};
