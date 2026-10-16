import { expect, test } from './support/isolatedTest.mjs';
import { adminLogin, adminPassword } from './support/credentials.mjs';

const menuLabels = ['الرئيسية', 'رخصة ممارس', 'رخصة مدير', 'رخصة مشرف', 'رخصة سكرتير'];

async function expectWithinViewport(locator, page) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
}

test('public headers keep the same menu, alignment and touch sizes before and after scrolling', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'warning' && message.text().includes('_uid')) errors.push(message.text());
  });
  const sizes = [];
  for (const [path, current] of [['', 'الرئيسية'], ['practitioner', 'رخصة ممارس']]) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    const header = page.locator('.public-header');
    await expect(header).toHaveCSS('color', 'rgb(8, 56, 74)');
    await expect(header).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.97)');
    const toggle = header.getByRole('button', { name: 'البرامج والرخص', exact: true });
    await expect(toggle).toBeVisible();
    await expect(header.getByRole('img', { name: 'شعار الجمعية', exact: true })).toBeVisible();
    const headerBox = await header.boundingBox();
    const toggleBox = await toggle.boundingBox();
    sizes.push({ header: headerBox.height, button: toggleBox.height });
    expect(toggleBox.height).toBeGreaterThanOrEqual(44);
    expect(toggleBox.width).toBeGreaterThanOrEqual(44);
    expect(Math.abs(toggleBox.y + toggleBox.height / 2 - headerBox.height / 2)).toBeLessThanOrEqual(1);
    for (const scrollY of [0, 450]) {
      await page.evaluate((y) => window.scrollTo(0, y), scrollY);
      if (scrollY) await expect(header).toHaveClass(/public-header--scrolled/);
      await toggle.click();
      const menu = page.getByRole('menu', { name: 'البرامج والرخص' });
      await expect(menu).toBeVisible();
      await expect(menu.getByRole('menuitem')).toHaveText(menuLabels);
      await expect(menu.getByRole('menuitem', { name: current, exact: true })).toHaveAttribute('aria-current', 'page');
      await expectWithinViewport(page.locator('.licenses-menu'), page);
      if (!scrollY && [390, 1440].includes(page.viewportSize().width)) {
        await expect(page.locator('.licenses-menu')).toHaveCSS('opacity', '1');
        await page.screenshot({ path: testInfo.outputPath(`${path || 'home'}-menu.png`) });
      }
      for (const label of menuLabels.slice(2)) await expect(menu.getByRole('menuitem', { name: label, exact: true })).toBeDisabled();
      await page.keyboard.press('Escape');
      await expect(menu).toHaveCount(0);
      await expect(toggle).toBeFocused();
    }
  }
  expect(sizes[0]).toEqual(sizes[1]);
  expect(errors).toEqual([]);
});

test('public navigation supports keyboard, outside dismissal, page links and mobile section links', async ({ page }) => {
  await page.goto('', { waitUntil: 'domcontentloaded' });
  let toggle = page.getByRole('button', { name: 'البرامج والرخص', exact: true });
  await toggle.focus();
  await page.keyboard.press('ArrowDown');
  let menu = page.getByRole('menu', { name: 'البرامج والرخص' });
  await expect(menu.getByRole('menuitem', { name: 'الرئيسية', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(menu.getByRole('menuitem', { name: 'رخصة ممارس', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(menu.getByRole('menuitem', { name: 'الرئيسية', exact: true })).toBeFocused();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/practitioner$/);
  toggle = page.getByRole('button', { name: 'البرامج والرخص', exact: true });
  await toggle.click();
  menu = page.getByRole('menu', { name: 'البرامج والرخص' });
  await page.locator('.public-header__brand').click();
  await expect(menu).toHaveCount(0);
  if (page.viewportSize().width < 1200) await toggle.click();
  await page.getByRole('navigation', { name: 'أقسام البرنامج' }).filter({ visible: true }).locator('a[href="#competencies"]').click();
  await expect(page).toHaveURL(/#competencies$/);
  await expect(menu).toHaveCount(0);
  await toggle.click();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  if (page.viewportSize().width < 1200) {
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
  }
  await expect(menu).toHaveCount(0);
  await toggle.click();
  await page.getByRole('menuitem', { name: 'الرئيسية', exact: true }).click();
  await expect(page).toHaveURL(/\/momars\/$/);
});

test('account access remains usable and opening a program menu dismisses the account menu', async ({ page }) => {
  const [session] = await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/auth/session')),
    page.goto('practitioner', { waitUntil: 'domcontentloaded' }),
  ]);
  await session.finished();
  await page.getByRole('button', { name: 'البرامج والرخص', exact: true }).click();
  await page.getByRole('button', { name: 'التسجيل', exact: true }).click();
  const loginDialog = page.getByRole('dialog', { name: 'تسجيل الدخول', exact: true });
  await expect(loginDialog).toBeVisible();
  await expect(page.getByRole('menu')).toHaveCount(0);
  await loginDialog.locator('input[autocomplete="username"]').fill(adminLogin);
  await loginDialog.locator('input[autocomplete="current-password"]').fill(adminPassword);
  const [signedIn] = await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/auth/login') && response.request().method() === 'POST'),
    loginDialog.locator('button[type="submit"]').click(),
  ]);
  expect(signedIn.status()).toBe(200);
  await expect(loginDialog).toHaveCount(0);
  const account = page.getByRole('button', { name: 'الحساب', exact: true });
  await account.click();
  const accountMenu = page.locator('.account-menu__panel--header');
  await expect(accountMenu).toBeVisible();
  await expectWithinViewport(accountMenu, page);
  await page.getByRole('button', { name: 'البرامج والرخص', exact: true }).click();
  await expect(accountMenu).toHaveCount(0);
  await expect(page.getByRole('menu')).toBeVisible();
  await account.click();
  await expect(page.getByRole('menu')).toHaveCount(0);
  await Promise.all([
    page.waitForResponse((response) => new URL(response.url()).pathname.endsWith('/logout') && response.request().method() === 'POST'),
    accountMenu.getByRole('button', { name: 'تسجيل الخروج', exact: true }).click(),
  ]);
  await expect(page.getByRole('button', { name: 'التسجيل', exact: true })).toBeVisible();
  await page.goto('dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('input[autocomplete="username"]')).toBeVisible();
});
