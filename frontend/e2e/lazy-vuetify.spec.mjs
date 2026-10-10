import { expect, test } from './support/isolatedTest.mjs';
import { adminLogin, adminPassword } from './support/credentials.mjs';

test('home defers Vuetify while login and dashboard install it before rendering', async ({ page }) => {
  const pluginRequests = [];
  const browserErrors = [];
  page.on('request', (request) => {
    if (/\/assets\/vuetify-[^/]+\.js(?:\?|$)/.test(request.url())) pluginRequests.push(request.url());
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text().includes('Vuetify')) browserErrors.push(message.text());
  });

  await page.goto('', { waitUntil: 'networkidle' });
  await expect(page.locator('.hero-title')).toBeVisible();
  const preload = page.locator('link[rel="preload"][as="font"]');
  await expect(preload).toHaveAttribute('href', /tajawal-arabic-800-normal.*\.woff2$/);
  expect(pluginRequests).toHaveLength(0);

  await page.goto('?login=1', { waitUntil: 'domcontentloaded' });
  const loginDialog = page.getByRole('dialog', { name: 'تسجيل الدخول', exact: true });
  await expect(loginDialog).toBeVisible();
  await loginDialog.locator('input[autocomplete="username"]').fill(adminLogin);
  await loginDialog.locator('input[autocomplete="current-password"]').fill(adminPassword);
  await Promise.all([
    page.waitForURL((url) => url.pathname === '/momars/dashboard'),
    loginDialog.locator('button[type="submit"]').click(),
  ]);
  await expect(page.locator('.dashboard-page')).toBeVisible();
  expect(pluginRequests).toHaveLength(1);
  await expect(page.locator('.v-application')).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.dashboard-page')).toBeVisible();
  expect(pluginRequests).toHaveLength(2);
  expect(browserErrors).toEqual([]);
});
