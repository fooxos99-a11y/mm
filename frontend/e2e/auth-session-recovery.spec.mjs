import { expect, test } from './support/isolatedTest.mjs';
import { adminLogin, adminPassword } from './support/credentials.mjs';

const user = { id: 'session-audit', name: 'حساب فحص', role: 'student', loginCode: 'audit', departmentId: 'audit', mustChangePassword: false };
const authState = (page) => page.evaluate(() => {
  const s = document.querySelector('#app')?.__vue_app__?.config.globalProperties.$store.state;
  if (!s) return { authenticated: false, checked: false };
  return { authenticated: Boolean(s.currentUser), checked: s.authChecked, loading: s.authLoading, dashboardError: s.dashboardError };
});
const dispatch = (page, action) => page.evaluate((action) => document.querySelector('#app').__vue_app__.config.globalProperties.$store.dispatch(action), action);

test('restoring a saved session closes an already opened login modal', async ({ page }) => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  await page.route('**/api/auth/session', async (route) => { await gate; await route.fulfill({ json: { user } }); });
  await page.route('**/api/dashboard/**', (route) => route.fulfill({ json: {} }));
  await page.goto('practitioner?login=1');
  await expect(page.getByText('جارٍ التحقق من الجلسة…')).toBeVisible();
  await expect(page.locator('.account-login form')).toHaveCount(0);
  release();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect.poll(async () => (await authState(page)).authenticated).toBe(true);
  await expect(page).not.toHaveURL(/login=1/);
});

test('a transient session failure retries automatically without asking for credentials', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/auth/session', (route) => ++requests === 1
    ? route.fulfill({ status: 503, json: {} }) : route.fulfill({ json: { user } }));
  await page.route('**/api/dashboard/**', (route) => route.fulfill({ json: {} }));
  await page.goto('practitioner?login=1');
  await expect.poll(async () => (await authState(page)).authenticated).toBe(true);
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  expect(requests).toBe(2);
});

test('an outage stays unresolved and offers recovery while preserving the requested route', async ({ page }) => {
  let recover = false;
  await page.route('**/api/auth/session', (route) => recover
    ? route.fulfill({ json: { user } }) : route.fulfill({ status: 503, json: {} }));
  await page.route('**/api/dashboard/**', (route) => route.fulfill({ json: {} }));
  await page.goto('student');
  await expect(page.getByRole('button', { name: 'إعادة المحاولة' })).toBeVisible();
  expect((await authState(page)).checked).toBe(false);
  await expect(page.locator('input[autocomplete="username"]')).toHaveCount(0);
  await expect(page).toHaveURL(/login\?redirect=\/student/);
  recover = true;
  await page.getByRole('button', { name: 'إعادة المحاولة' }).click();
  await expect(page).toHaveURL((url) => url.pathname.endsWith('/student'));
  await expect.poll(async () => (await authState(page)).authenticated).toBe(true);
  expect((await authState(page)).authenticated).toBe(true);
});

test('a rejected snapshot rechecks the session before clearing the account', async ({ page }) => {
  let sessions = 0;
  let snapshots = 0;
  await page.route('**/api/auth/session', (route) => { sessions++; return route.fulfill({ json: { user } }); });
  await page.route('**/api/dashboard/snapshot**', (route) => ++snapshots === 1
    ? route.fulfill({ status: 401, json: {} }) : route.fulfill({ json: {} }));
  await page.goto('practitioner');
  await expect.poll(() => snapshots).toBeGreaterThanOrEqual(2);
  expect((await authState(page)).authenticated).toBe(true);
  expect(sessions).toBe(2);
});

test('a confirmed expired session removes the account and protects private routes', async ({ page }) => {
  let expired = false;
  await page.route('**/api/auth/session', (route) => route.fulfill({ json: { user: expired ? null : user } }));
  await page.route('**/api/dashboard/snapshot**', (route) => expired
    ? route.fulfill({ status: 401, json: {} }) : route.fulfill({ json: {} }));
  await page.goto('practitioner');
  await expect.poll(async () => (await authState(page)).authenticated).toBe(true);
  expired = true;
  await dispatch(page, 'loadDashboardSnapshot');
  expect((await authState(page)).authenticated).toBe(false);
  await page.goto('student');
  await expect(page).toHaveURL(/login\?redirect=\/student/);
  await expect(page.locator('.account-login form')).toBeVisible();
  const passwordToggle = await page.getByRole('button', { name: 'إظهار كلمة المرور' }).boundingBox();
  expect(passwordToggle.width).toBeGreaterThanOrEqual(44);
  expect(passwordToggle.height).toBeGreaterThanOrEqual(44);
});

test('every login entry uses the same fields and returns to the requested page', async ({ page, context }) => {
  for (const entry of ['?login=1', 'practitioner?login=1', 'login']) {
    await context.clearCookies();
    const separator = entry.includes('?') ? '&' : '?';
    await page.goto(`${entry}${separator}redirect=${encodeURIComponent('/dashboard?panel=courses')}`);
    await page.locator('input[autocomplete="username"]').fill(adminLogin);
    await page.locator('input[autocomplete="current-password"]').fill(adminPassword);
    await page.getByRole('button', { name: 'إظهار كلمة المرور' }).click();
    await expect(page.locator('input[autocomplete="current-password"]')).toHaveAttribute('type', 'text');
    await page.locator('.account-login button[type="submit"]').click();
    await expect(page).toHaveURL(/\/dashboard\?panel=courses$/);
    await expect(page.locator('.dashboard-page')).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard\?panel=courses$/);
    await expect(page.locator('.dashboard-page')).toBeVisible();
  }
});

test('invalid credentials keep the user outside private pages', async ({ page }) => {
  await page.goto('login');
  await page.locator('input[autocomplete="username"]').fill('audit-invalid');
  await page.locator('input[autocomplete="current-password"]').fill('invalid');
  await page.locator('.account-login button[type="submit"]').click();
  await expect(page.getByRole('alert')).toContainText('بيانات الدخول غير صحيحة');
  expect((await authState(page)).authenticated).toBe(false);
  await page.goto('dashboard');
  await expect(page).toHaveURL(/login\?redirect=\/dashboard/);
});

test('the shared panel stays inside the viewport with a separately scrolling form', async ({ page }, info) => {
  const normalViewport = page.viewportSize();
  for (const entry of ['practitioner?login=1', 'login', '?login=1']) {
    await page.goto(entry);
    await expect(page.locator('.account-login form')).toBeVisible();
    const toggle = await page.getByRole('button', { name: 'إظهار كلمة المرور' }).boundingBox();
    expect(toggle.width).toBeGreaterThanOrEqual(44);
    expect(toggle.height).toBeGreaterThanOrEqual(44);
    for (const viewport of [normalViewport, { width: 320, height: 568 }, { width: 390, height: 300 }, normalViewport]) {
      await page.setViewportSize(viewport);
      const panel = page.locator('.account-login');
      await expect.poll(async () => {
        const box = await panel.boundingBox();
        return box.y >= 0 && box.x >= 0 && box.y + box.height <= viewport.height + 1 && box.x + box.width <= viewport.width + 1;
      }).toBe(true);
      await page.locator('input[autocomplete="current-password"]').focus();
      await page.locator('.account-login__body').evaluate((element) => { element.scrollTop = element.scrollHeight; });
      const header = await page.locator('.account-login__header').boundingBox();
      expect(header.y).toBeGreaterThanOrEqual(0);
      await expect(page.locator('.account-login button[type="submit"]')).toBeInViewport();
    }
    await page.screenshot({ path: info.outputPath(`unified-login-${entry.startsWith('practitioner') ? 'practitioner' : entry === 'login' ? 'page' : 'home'}.png`) });
    if (entry !== 'login') {
      await page.getByRole('button', { name: 'إغلاق', exact: true }).click();
      await expect(page.locator('dialog[open]')).toHaveCount(0);
    }
  }
});

test('older public responses finish before login can replace the session cookie', async ({ page }) => {
  let release;
  let ready;
  const gate = new Promise((resolve) => { release = resolve; });
  const fetched = new Promise((resolve) => { ready = resolve; });
  let logins = 0;
  page.on('request', (request) => { if (request.url().endsWith('/api/auth/login')) logins++; });
  await page.route('**/api/public/stats', async (route) => {
    const response = await route.fetch();
    ready();
    await gate;
    await route.fulfill({ response });
  });
  await page.goto('practitioner?login=1');
  await fetched;
  await page.locator('input[autocomplete="username"]').fill(adminLogin);
  await page.locator('input[autocomplete="current-password"]').fill(adminPassword);
  await page.locator('.account-login button[type="submit"]').click();
  await page.waitForTimeout(150);
  expect(logins).toBe(0);
  release();
  await expect(page).toHaveURL((url) => url.pathname.endsWith('/dashboard'));
  await expect(page.locator('.dashboard-page')).toBeVisible();
  await page.reload();
  await expect(page.locator('.dashboard-page')).toBeVisible();
  expect(logins).toBe(1);
});
