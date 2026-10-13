import { expect, test } from './support/isolatedTest.mjs';
import { login } from './support/gesture-helpers.mjs';

const expectContained = async (locator, page) => {
  const bounds = await locator.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize().width + 1);
};

test('shared controls support keyboard focus, password reveal and compact RTL fields', async ({ page }, info) => {
  await page.goto('login');
  const username = page.locator('[autocomplete=username]');
  const password = page.locator('[autocomplete=current-password]');
  await username.focus();
  const field = username.locator('xpath=ancestor::div[contains(concat(" ",normalize-space(@class)," ")," v-field ")][1]');
  await expect(field).toHaveClass(/v-field--focused/);
  await expect.poll(() => field.evaluate(element => getComputedStyle(element).boxShadow)).not.toBe('none');
  expect((await field.boundingBox()).height).toBeGreaterThanOrEqual(48);
  await password.fill('local-preview-value');
  await page.getByRole('button', { name: 'إظهار كلمة المرور', exact: true }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'إخفاء كلمة المرور', exact: true }).click();
  await expect(password).toHaveAttribute('type', 'password');
  await expect(password).toHaveValue('local-preview-value');
  await password.clear();
  await expectContained(field, page);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: info.outputPath('login.png'), fullPage: true });

  await login(page);
  await page.goto('dashboard?panel=users');
  const card = page.locator('.admin-workspace-card').first();
  await expect(card).toBeVisible();
  await expect(card).toHaveCSS('border-radius', '12px');
  const branch = page.locator('#people-branch-filter');
  await branch.focus();
  await page.keyboard.press('ArrowDown');
  const menu = page.locator('.app-dropdown-menu').filter({ visible: true });
  await expect(menu).toBeVisible();
  await expectContained(menu, page);
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(branch).toBeFocused();
  for (const control of await card.locator('.app-filter-toolbar .v-field').all()) {
    expect((await control.boundingBox()).height).toBe(48);
    await expect(control).toHaveCSS('border-radius', '8px');
    await expectContained(control, page);
  }
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: info.outputPath('users.png'), fullPage: true });
});
