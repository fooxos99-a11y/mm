import { expect, test } from '@playwright/test';

const assertNoPageOverflow = async (page) => {
  const dimensions = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    document: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
    offenders: [...document.querySelectorAll('body *')]
      .map((element) => {
        const rect = element.getBoundingClientRect();

        return {
          element: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${[...element.classList].map((name) => `.${name}`).join('')}`,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      })
      .filter((rect) => rect.left < -1 || rect.right > window.innerWidth + 1)
      .slice(0, 10),
  }));

  expect(
    Math.max(dimensions.body, dimensions.document),
    `Page width exceeds viewport: ${JSON.stringify(dimensions)}`,
  ).toBeLessThanOrEqual(dimensions.viewport + 1);
};

test('public pages fit the viewport and expose usable controls', async ({ page }) => {
  for (const path of ['', 'login', 'registration']) {
    const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
    expect(response?.headers()['content-security-policy']).toContain("script-src 'self'");
    await expect(page.locator('main.app-shell')).toBeVisible();
    await expect(page.locator('h1').first()).toBeVisible();
    await assertNoPageOverflow(page);
  }

  await page.goto('login', { waitUntil: 'domcontentloaded' });
  const submit = page.locator('form button[type="submit"]');
  const loginCode = page.locator('input[autocomplete="username"]');
  const password = page.locator('input[autocomplete="current-password"]');

  await expect(loginCode).toBeVisible();
  await expect(password).toBeVisible();
  await expect(submit).toBeVisible();

  const submitBox = await submit.boundingBox();
  expect(submitBox?.height || 0).toBeGreaterThanOrEqual(44);
});
