import { expect, test } from '@playwright/test';
import { adminLogin, adminPassword, newAccountPassword } from './support/credentials.mjs';

test.use({ screenshot: 'off' });

test('password change refreshes stale CSRF while preserving authentication and validation', async ({ page, context }) => {
  const signIn = async (password) => {
    await page.goto('login');
    await page.locator('input[autocomplete="username"]').fill(adminLogin);
    await page.locator('input[autocomplete="current-password"]').fill(password);
    await page.locator('form button[type="submit"]').click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('change-password');
  };
  const fillPassword = async (current, next) => {
    await page.locator('input[autocomplete="current-password"]').fill(current);
    await page.locator('input[autocomplete="new-password"]').nth(0).fill(next);
    await page.locator('input[autocomplete="new-password"]').nth(1).fill(next);
  };
  const submitPassword = async () => {
    const response = page.waitForResponse((result) => result.url().endsWith('/api/auth/password')
      && result.request().method() === 'PUT');
    await page.locator('form button[type="submit"]').click();
    return response;
  };

  await test.step('sign in and open password form', () => signIn(adminPassword));
  const apiOrigin = new URL(process.env.VUE_APP_API_BASE_URL).origin;
  const endpoint = `${apiOrigin}/api/auth/password`;
  const payload = {
    currentPassword: adminPassword,
    password: newAccountPassword,
    passwordConfirmation: newAccountPassword,
  };
  const rejected = await page.request.put(endpoint, {
    timeout: 15000,
    headers: { Referer: page.url(), Accept: 'application/json' },
    data: payload,
  });
  expect(rejected.status()).toBe(419);

  const csrfCookie = (await context.cookies(apiOrigin)).find((cookie) => cookie.name === 'XSRF-TOKEN');
  expect(csrfCookie).toBeTruthy();
  await context.addCookies([{ ...csrfCookie, value: 'stale-csrf-token' }]);
  await fillPassword('Wrong-current-password', newAccountPassword);
  const invalid = await submitPassword();
  expect(invalid.status()).toBe(422);
  expect((await invalid.json()).errors.currentPassword).toBeTruthy();

  await fillPassword(adminPassword, newAccountPassword);
  expect((await submitPassword()).status()).toBe(200);
  await expect(page).toHaveURL(/\/login$/);

  // Restore the shared throw-away account for the next viewport project.
  await signIn(newAccountPassword);
  await fillPassword(newAccountPassword, adminPassword);
  expect((await submitPassword()).status()).toBe(200);
  await expect(page).toHaveURL(/\/login$/);

  await page.request.get(`${apiOrigin}/sanctum/csrf-cookie`);
  const guestCookie = (await context.cookies(apiOrigin)).find((cookie) => cookie.name === 'XSRF-TOKEN');
  const guest = await page.request.put(endpoint, {
    timeout: 15000,
    headers: {
      Referer: page.url(),
      Accept: 'application/json',
      'X-XSRF-TOKEN': decodeURIComponent(guestCookie.value),
    },
    data: payload,
  });
  expect(guest.status()).toBe(401);
});
