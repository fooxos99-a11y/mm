import { adminLogin, adminPassword } from './credentials.mjs';

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
  await page.goto('login');
  await page.locator('[autocomplete=username]').fill(name);
  await page.locator('[autocomplete=current-password]').fill(password);
  await page.locator('form button[type=submit]').click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'));
}
