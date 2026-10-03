import { expect, test } from '@playwright/test';
import { adminLogin, adminPassword } from './support/credentials.mjs';


const login = async (page) => {
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/auth/session')),
    page.goto('login', { waitUntil: 'domcontentloaded' }),
  ]);
  await page.locator('input[autocomplete="username"]').fill(adminLogin);
  await page.locator('input[autocomplete="current-password"]').fill(adminPassword);
  await Promise.all([
    page.waitForURL((url) => url.pathname === '/momars/dashboard'),
    page.waitForResponse((response) => response.url().endsWith('/dashboard/shell')),
    page.locator('form button[type="submit"]').click(),
  ]);
};

const expectNoOverflow = async (page) => {
  const dimensions = await page.evaluate(() => ({
    content: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
    viewport: window.innerWidth,
  }));

  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
};

test('management panels remain usable across the viewport matrix', async ({ page }) => {
  await login(page);

  await page.goto('dashboard?panel=users');
  await expect(page.locator('.people-page')).toBeVisible();
  const peopleFilters = page.locator('.people-filter-field');
  await expect(peopleFilters).toHaveCount(2);
  await expect(page.locator('.people-toolbar__filters .app-select')).toHaveCount(2);
  await expect(page.locator('.people-toolbar__filters .app-native-select')).toHaveCount(0);
  const branchFilterBox = await peopleFilters.nth(0).boundingBox();
  const entityFilterBox = await peopleFilters.nth(1).boundingBox();
  expect(branchFilterBox).not.toBeNull();
  expect(entityFilterBox).not.toBeNull();
  if (page.viewportSize().width < 480) {
    expect(entityFilterBox.y).toBeGreaterThanOrEqual(branchFilterBox.y + branchFilterBox.height);
  } else {
    expect(Math.abs(branchFilterBox.y - entityFilterBox.y)).toBeLessThanOrEqual(1);
  }
  await page.locator('.people-toolbar__filters .app-select').first().click();
  await expect(page.locator('.app-dropdown-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  const addButton = page.locator('.dashboard-topbar').getByRole('button', { name: 'إضافة', exact: true });
  await expect(addButton).toBeVisible();
  expect((await addButton.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await expectNoOverflow(page);

  await page.goto('dashboard?panel=settings&settingsItem=archive');
  await expect(page.locator('.admin-archive-view')).toBeVisible();
  const searchInput = page.locator('.admin-archive-view__search-input');
  await expect(searchInput).toBeVisible();
  expect((await searchInput.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await expectNoOverflow(page);

  await page.goto('dashboard?panel=settings&settingsItem=permissions');
  await expect(page.locator('.permissions-admin')).toBeVisible();
  const permissionRow = page.locator('.permissions-admin__permission-row').first();
  await expect(permissionRow).toBeVisible();
  expect((await permissionRow.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await expectNoOverflow(page);

  await page.goto('dashboard?panel=settings&settingsItem=home');
  await expect(page.locator('.home-page-settings')).toBeVisible();
  const homeDeleteButton = page.locator('.home-page-settings__card-head .app-icon-button').first();
  await expect(homeDeleteButton).toBeVisible();
  expect((await homeDeleteButton.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await expectNoOverflow(page);

  await page.goto('dashboard?panel=courses');
  await expect(page.locator('.assessment-page')).toBeVisible();
  await expect(page.locator('.assessment-select').first()).toBeVisible();
  await expectNoOverflow(page);
});
