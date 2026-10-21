import { expect, test } from './support/isolatedTest.mjs';
import { login } from './support/gesture-helpers.mjs';

test('shared workspace geometry survives different lazy stylesheet arrival orders', async ({ page }) => {
  await login(page);
  for (const panel of ['courses', 'tasks', 'materials', 'results', 'completion']) {
    await page.goto(`dashboard?panel=${panel}`);
    const card = page.locator('.admin-workspace-card').first();
    await expect(card).toBeVisible();
    await page.evaluate(async () => {
      await document.fonts.ready;
      // Lazy components can load their legacy rules after the shared dashboard rules.
      const links = [...document.querySelectorAll('link[rel="stylesheet"]')];
      links.reverse().forEach((link) => document.head.appendChild(link));
    });
    const box = await card.boundingBox();
    const header = await page.locator('.dashboard-topbar').boundingBox();
    expect(Math.abs(box.x - header.x), `${panel} horizontal alignment`).toBeLessThanOrEqual(1);
    expect(Math.abs(box.width - header.width), `${panel} card width`).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});
