import { expect, test } from '@playwright/test';

const adminLogin = process.env.E2E_ADMIN_LOGIN || 'e2e-admin';
const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'E2E-Momars-2026!';
const phones = {
  'mobile-320': '1100000320',
  'mobile-390': '1100000390',
  'tablet-768': '1100000768',
  'laptop-1024': '1100001024',
  'desktop-1440': '1100001440',
};
const loginCodes = {
  'mobile-320': '321',
  'mobile-390': '390',
  'tablet-768': '768',
  'laptop-1024': '124',
  'desktop-1440': '440',
};

test('public registration persists a complete request', async ({ page }, testInfo) => {
  await page.goto('login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[autocomplete="username"]').fill(adminLogin);
  await page.locator('input[autocomplete="current-password"]').fill(adminPassword);
  await Promise.all([
    page.waitForURL((url) => url.pathname === '/momars/dashboard'),
    page.locator('form button[type="submit"]').click(),
  ]);

  const settingsStatus = await page.evaluate(async () => {
    const token = document.cookie
      .split('; ')
      .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
      ?.slice('XSRF-TOKEN='.length);
    const response = await fetch('/momars/api/dashboard/registration/settings', {
      method: 'PUT',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': decodeURIComponent(token || ''),
      },
      body: JSON.stringify({ isOpen: true }),
    });

    return response.status;
  });
  expect(settingsStatus).toBe(204);

  await page.context().clearCookies();
  await page.goto('registration', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.registration-entry__form')).toBeVisible();

  const phone = phones[testInfo.project.name] || '1100099999';
  const loginCode = loginCodes[testInfo.project.name] || '999';
  await page.locator('#registration-name').fill('مستخدم اختبار متكامل');
  await page.locator('#registration-phone').fill(phone);
  const genderField = page.locator('.registration-entry__field')
    .filter({ has: page.locator('label[for="registration-gender"]') })
    .locator('.v-field');
  await genderField.click();
  await page.getByRole('option', { name: 'ذكر', exact: true }).click();
  await page.locator('#registration-field-age').fill('30');

  const responsePromise = page.waitForResponse((response) => (
    response.url().endsWith('/api/public/registration-requests')
      && response.request().method() === 'POST'
  ));
  await page.locator('.registration-entry__form button[type="submit"]').click();
  const response = await responsePromise;

  expect(response.status()).toBe(201);
  await expect(page.locator('.registration-entry__state--success')).toBeVisible();
  await expect(page.locator('.Vue-Toastification__toast').filter({ hasText: 'سيحدد المسؤول بيانات الدخول' })).toBeVisible();

  await page.context().clearCookies();
  await page.goto('login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[autocomplete="username"]').fill(adminLogin);
  await page.locator('input[autocomplete="current-password"]').fill(adminPassword);
  await Promise.all([
    page.waitForURL((url) => url.pathname === '/momars/dashboard'),
    page.locator('form button[type="submit"]').click(),
  ]);
  await page.goto('dashboard?panel=settings&settingsItem=registration');

  const requestRow = page.locator('.registration-admin__request-row').filter({ hasText: 'مستخدم اختبار متكامل' });
  await requestRow.getByRole('button', { name: 'قبول', exact: true }).click();
  await expect(page.locator('.registration-acceptance')).toBeVisible();
  await page.locator('.registration-acceptance__credentials input[type="text"]').fill(loginCode);
  await page.locator('.registration-acceptance__credentials input[type="password"]').fill('Registration-654');

  const acceptResponsePromise = page.waitForResponse((candidate) => (
    candidate.url().includes('/api/dashboard/registration-requests/')
      && candidate.url().endsWith('/accept')
      && candidate.request().method() === 'POST'
  ));
  await page.getByRole('button', { name: 'قبول وإنشاء الحساب', exact: true }).click();
  expect((await acceptResponsePromise).status()).toBe(200);
  await expect(page.locator('.registration-acceptance')).not.toBeVisible();

  await page.context().clearCookies();
  await page.goto('login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[autocomplete="username"]').fill(loginCode);
  await page.locator('input[autocomplete="current-password"]').fill('Registration-654');
  await Promise.all([
    page.waitForURL((url) => url.pathname === '/momars/student'),
    page.locator('form button[type="submit"]').click(),
  ]);
  await expect(page.locator('.student-page')).toBeVisible();
  await expect(page).not.toHaveURL(/change-password/);
});
