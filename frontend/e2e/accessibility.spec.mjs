import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const criticalViolations = (results) => results.violations.filter(
  ({ impact }) => impact === 'critical' || impact === 'serious',
);
const adminLogin = process.env.E2E_ADMIN_LOGIN || 'e2e-admin';
const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'E2E-Momars-2026!';

const expectAccessiblePage = async (page, name) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(
    criticalViolations(results),
    `${name}: ${JSON.stringify(results.violations, null, 2)}`,
  ).toEqual([]);
};

test('public pages have no serious accessibility violations', async ({ page }) => {
  for (const path of ['', 'login', 'registration']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main.app-shell')).toBeVisible();

    await expectAccessiblePage(page, path || 'home');
  }
});

test('management pages have no serious accessibility violations', async ({ page }) => {
  await page.goto('login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[autocomplete="username"]').fill(adminLogin);
  await page.locator('input[autocomplete="current-password"]').fill(adminPassword);
  await Promise.all([
    page.waitForURL((url) => url.pathname === '/momars/dashboard'),
    page.locator('form button[type="submit"]').click(),
  ]);

  const pages = [
    ['dashboard', '.dashboard-page'],
    ['dashboard?panel=finalexam', '.final-exam-page'],
    ['dashboard?panel=satisfaction', '.satisfaction-admin'],
    ['dashboard?panel=users', '.people-page'],
    ['dashboard?panel=notifications', '.communications-page'],
    ['dashboard?panel=materials', '.admin-training-materials'],
    ['dashboard?panel=results', '.results-view'],
    ['dashboard?panel=completion', '.completion-page'],
    ['dashboard?panel=settings&settingsItem=registration', '.registration-admin'],
    ['dashboard?panel=settings&settingsItem=home', '.home-page-settings'],
    ['dashboard?panel=settings&settingsItem=archive', '.admin-archive-view'],
    ['dashboard?panel=settings&settingsItem=permissions', '.permissions-admin'],
  ];

  for (const [path, readySelector] of pages) {
    await page.goto(path);
    await expect(page.locator(readySelector)).toBeVisible();
    await expectAccessiblePage(page, path);
  }
});
