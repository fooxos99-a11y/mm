import { expect, test } from './support/isolatedTest.mjs';
import { login } from './support/gesture-helpers.mjs';

test('shared workspace geometry survives different lazy stylesheet arrival orders', async ({ page }) => {
  await login(page);
  for (const panel of ['courses', 'tasks', 'materials', 'results', 'completion']) {
    await page.goto(`dashboard?panel=${panel}`);
    const card = page.locator('.admin-workspace-card').first();
    await expect(card).toBeVisible();
    const moved = await page.evaluate(async () => {
      await document.fonts.ready;
      // Delay legacy panel styles, preserving the base/responsive dependency order.
      const links = [...document.querySelectorAll('link[rel="stylesheet"]')].filter(link =>
        /\/(?:Admin[^/]+|CompletionRequirementsPanel)-[^/]+\.css(?:\?|$)/.test(link.href));
      links.reverse().forEach((link) => document.head.appendChild(link));
      return links.length;
    });
    expect(moved, `${panel} legacy styles were delayed`).toBeGreaterThan(0);
    // Reinserted styles settle asynchronously; measure both boxes in the same frame.
    await expect.poll(() => card.evaluate(element => {
      const box = element.getBoundingClientRect();
      const header = document.querySelector('.dashboard-topbar').getBoundingClientRect();
      return Math.max(Math.abs(box.x - header.x), Math.abs(box.width - header.width),
        document.documentElement.scrollWidth - innerWidth);
    }), { message: `${panel} aligned card without horizontal overflow` }).toBeLessThanOrEqual(1);
  }
});
