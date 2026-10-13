import { adminLogin, adminPassword } from './credentials.mjs';
import { expect } from '@playwright/test';

export async function swipe(page, x, fromY, toY) {
  const cdp = await page.context().newCDPSession(page);
  const point = (y) => [{ x, y, radiusX: 6, radiusY: 6, force: 1, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(fromY) });
  for (let step = 1; step <= 14; step += 1) {
    await page.waitForTimeout(22);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: point(fromY + ((toY - fromY) * step) / 14),
    });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(450);
  await cdp.detach();
}

export async function login(page, name = adminLogin, password = adminPassword) {
  const [session] = await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/auth/session')),
    page.goto('login'),
  ]);
  await session.finished();
  expect(session.status()).toBe(200);
  await page.locator('[autocomplete=username]').fill(name);
  await page.locator('[autocomplete=current-password]').fill(password);
  const [signedIn] = await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/auth/login') && response.request().method() === 'POST'),
    page.locator('form button[type=submit]').click(),
  ]);
  expect(signedIn.status()).toBe(200);
  await page.waitForURL((url) => !url.pathname.endsWith('/login'));
}

export async function openCourseManagement(page) {
  const management = page.locator('.app-select-action-row__actions').filter({ visible: true }).filter({ has: page.getByRole('button') }).first();
  await expect(management).toBeVisible();
  await expect(management.getByRole('button').first()).toBeVisible();
}

export async function selectOption(page, label, { exact = false } = {}) {
  const row = page.getByRole('row', { name: label, exact }).and(page.locator('.app-select-action-row'));
  await page.getByRole('option', { name: label, exact }).or(row).click();
}
