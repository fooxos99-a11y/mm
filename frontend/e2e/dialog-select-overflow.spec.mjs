import { expect, test } from './support/isolatedTest.mjs';
import { login, swipe } from './support/gesture-helpers.mjs';

test('dialog menus escape clipped bodies, scroll and select without closing the dialog', async ({ page, context }, info) => {
  test.setTimeout(180_000);
  await login(page);
  const origin = new URL(process.env.VUE_APP_API_BASE_URL).origin;
  const csrf = (await context.cookies(origin)).find(cookie => cookie.name === 'XSRF-TOKEN');
  const headers = { Referer: page.url(), 'X-XSRF-TOKEN': decodeURIComponent(csrf.value) };
  for (let index = 0; index < 9; index += 1) {
    const response = await page.request.post(`${origin}/api/dashboard/courses`, {
      headers, data: { title: `دورة اختبار القائمة ${index}`, isActive: false },
    });
    expect(response.status()).toBe(201);
  }
  await page.goto('dashboard?panel=satisfaction');
  await page.locator('.dashboard-topbar').getByRole('button', { name: 'إضافة', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const field = dialog.locator('.app-select').filter({ has: page.getByRole('combobox', { name: 'الدورة', exact: true }) });
  await field.locator('.v-field').click();
  const menu = dialog.locator(':scope > .v-overlay-container .app-dropdown-menu').filter({ visible: true });
  await expect(menu).toBeVisible();
  await expect.poll(() => menu.evaluate(element => element.getAnimations({ subtree: true })
    .filter(animation => animation.playState === 'running').length)).toBe(0);
  await expect(dialog.locator('.app-dialog-body .app-dropdown-menu')).toHaveCount(0);
  const bounds = await menu.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize().width + 1);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(page.viewportSize().height + 1);
  if (info.project.use.hasTouch) {
    await page.screenshot({ path: info.outputPath('dialog-menu-before-touch.png') });
    const x = bounds.x + bounds.width / 2;
    await swipe(page, x, bounds.y + bounds.height - 25, bounds.y + 25);
    await expect.poll(() => menu.evaluate(element => Math.max(
      element.scrollTop, ...[...element.querySelectorAll('.v-list')].map(list => list.scrollTop),
    ))).toBeGreaterThan(0);
  }
  const lastOption = menu.getByRole('option').last();
  const selectedTitle = (await lastOption.innerText()).trim();
  await lastOption.scrollIntoViewIfNeeded();
  await expect.poll(() => lastOption.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
  })).toBe(true);
  await page.screenshot({ path: info.outputPath('dialog-menu.png') });
  await lastOption.click();
  await expect(field).toContainText(selectedTitle);
  await expect(menu).toHaveCount(0);
  await expect(dialog).toBeVisible();

  await field.locator('.v-field').click();
  await expect(menu).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(field.locator('input[role="combobox"]')).toBeFocused();

  await field.locator('.v-field').click();
  await menu.getByRole('option').first().focus();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(dialog).toBeVisible();

  await field.locator('.v-field').click();
  await dialog.getByRole('textbox', { name: 'نص السؤال', exact: true }).click();
  await expect(menu).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'إلغاء', exact: true }).click();
  await expect(dialog).toHaveCount(0);

  await page.goto('dashboard?panel=users');
  await page.locator('.dashboard-topbar').getByRole('button', { name: 'إضافة', exact: true }).click();
  await dialog.locator('.app-select').filter({ has: page.locator('#people-editor-branch') }).locator('.v-field').click();
  const branch = dialog.getByRole('option', { name: 'معلمات', exact: true });
  await expect(branch).toBeVisible();
  await branch.click();
  await expect(dialog.locator('#people-editor-branch')).toHaveValue('معلمات');
  await expect(dialog).toBeVisible();
});
