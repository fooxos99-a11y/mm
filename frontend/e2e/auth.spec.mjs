import { expect, test } from './support/isolatedTest.mjs';
import { adminLogin, adminPassword } from './support/credentials.mjs';


const assertNoPageOverflow = async (page) => {
  const dimensions = await page.evaluate(() => ({
    width: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
    viewport: window.innerWidth,
  }));

  expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport + 1);
};

test('protected dashboard redirects guests to login', async ({ page }) => {
  await page.goto('dashboard', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => new URL(page.url()).pathname).toBe('/momars/login');

  const redirect = new URL(page.url()).searchParams.get('redirect');
  expect(redirect).toContain('/dashboard');
});

test('admin can sign in and use the responsive dashboard shell', async ({ page }) => {
  let snapshotRequests = 0;
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.endsWith('/api/dashboard/shell')) {
      snapshotRequests += 1;
    }
  });

  await page.goto('login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[autocomplete="username"]').fill(adminLogin);
  await page.locator('input[autocomplete="current-password"]').fill(adminPassword);

  await Promise.all([
    page.waitForURL((url) => url.pathname === '/momars/dashboard', { timeout: 90_000 }),
    page.locator('form button[type="submit"]').click(),
  ]);

  await expect(page.locator('.dashboard-page')).toBeVisible();
  await expect(page.locator('.dashboard-topbar__name')).toContainText('E2E Admin');
  await assertNoPageOverflow(page);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator('.dashboard-page')).toBeVisible();
  await expect(page.locator('.dashboard-topbar__name')).toContainText('E2E Admin');

  const viewport = page.viewportSize();

  if (viewport && viewport.width <= 1024) {
    const menuButton = page.locator('.dashboard-topbar__mobile button');
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    await expect(page.locator('.dashboard-sidebar')).toHaveClass(/dashboard-sidebar--open/);
  } else {
    await expect(page.locator('.dashboard-sidebar')).toBeVisible();
  }

  expect(snapshotRequests).toBe(2);
  await page.locator('.dashboard-nav__item').nth(1).click();
  await expect(page).toHaveURL(/panel=courses/);
  expect(snapshotRequests).toBe(2);
});
