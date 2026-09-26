// Credentials for the throw-away E2E database. scripts/run-e2e.mjs generates
// fresh random values for every run and seeds the accounts with them.
const readCredential = (name) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not set. Run the browser tests with "npm run test:e2e".`);
  }

  return value;
};

export const adminLogin = process.env.E2E_ADMIN_LOGIN || 'e2e-admin';
export const adminPassword = readCredential('E2E_ADMIN_PASSWORD');
export const rolePassword = readCredential('E2E_ROLE_PASSWORD');
export const studentPassword = readCredential('E2E_STUDENT_PASSWORD');
export const newAccountPassword = readCredential('E2E_NEW_ACCOUNT_PASSWORD');
