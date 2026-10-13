import { expect, test } from './support/isolatedTest.mjs';
import { login } from './support/gesture-helpers.mjs';

test('notification recipients hide login IDs and use compact filled selection circles', async ({ page }, info) => {
  await login(page);
  await page.goto('dashboard?panel=notifications');
  const panel = page.locator('.communications-page__prep-card');
  const rows = panel.locator('tbody .attendance-toggle');
  const all = panel.locator('.prep-filters--selection .attendance-toggle');
  const first = rows.first();
  await expect(first).toBeVisible();
  await expect(panel.getByText('رقم الدخول', { exact: true })).toHaveCount(0);
  await expect(panel.locator('.prep-table__login')).toHaveCount(0);
  await expect(first).toHaveAttribute('aria-pressed', 'false');
  const dimensions = await first.evaluate(element => ({
    target: element.getBoundingClientRect().width,
    circle: element.firstElementChild.getBoundingClientRect().width,
  }));
  expect(dimensions).toEqual({ target: 44, circle: 24 });
  await first.focus();
  await first.press('Space');
  await expect(first).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => first.locator('span').evaluate(element => getComputedStyle(element).backgroundColor)).toBe('rgb(29, 106, 133)');
  if (await rows.count() > 1) await expect(all).toHaveAttribute('aria-pressed', 'mixed');
  await all.click();
  await expect(panel.locator('tbody .attendance-toggle[aria-pressed=false]')).toHaveCount(0);
  await expect(all).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => all.locator('span').evaluate(element => getComputedStyle(element).backgroundColor)).toBe('rgb(29, 106, 133)');
  await page.screenshot({ path: info.outputPath('notification-selection.png'), fullPage: false });
  await all.click();
  await expect(panel.locator('tbody .attendance-toggle[aria-pressed=true]')).toHaveCount(0);
  await expect(all).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => first.locator('span').evaluate(element => getComputedStyle(element).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
