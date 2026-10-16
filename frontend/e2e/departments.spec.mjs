import { expect, test } from './support/isolatedTest.mjs';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

test.use({ actionTimeout: 20_000 });

const initialDepartments = () => [{ id: 'd1', name: 'الإدارة الحالية', isActive: true, managerTitle: 'مدير النمو المهني', manager: { id: 1, name: 'مسؤول الإدارة الحالية', loginCode: '1001' } }];
const systemUser = { id: 99, name: 'مدير النظام التجريبي', loginCode: '9000', role: 'super_admin', systemRole: 'super_admin', mustChangePassword: false };
const shell = { snapshotMode: 'shell', branches: [{ id: 'male', name: 'معلمين' }, { id: 'female', name: 'معلمات' }], courses: [], students: [], reciters: [], taskTemplates: [], rolePermissions: {}, notifications: [] };

async function mockSystem(page, initialUser = systemUser) {
  let user = initialUser ? { ...initialUser } : null;
  const departments = initialDepartments();
  const writes = [];
  const dashboardHeaders = [];
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const endpoint = url.pathname.slice(url.pathname.indexOf('/api') + 4);
    const fulfill = body => route.fulfill({ json: body });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': url.origin, 'access-control-allow-credentials': 'true', 'access-control-allow-methods': 'GET, POST, PUT, OPTIONS', 'access-control-allow-headers': '*' } });
    if (endpoint === '/auth/session') return fulfill({ user });
    if (endpoint === '/auth/logout') { user = null; return fulfill({}); }
    if (endpoint === '/management/context') {
      const { departmentId } = request.postDataJSON();
      const department = departments.find(item => item.id === departmentId);
      user = department ? { ...systemUser, role: 'admin', departmentId, departmentName: department.name, roleLabel: department.managerTitle } : { ...systemUser };
      return fulfill({ user });
    }
    if (endpoint === '/management/departments' && request.method() === 'GET') return fulfill({ departments });
    if (endpoint.startsWith('/management/departments') && ['POST', 'PUT'].includes(request.method())) {
      const payload = request.postDataJSON();
      writes.push(payload);
      const id = endpoint.split('/')[3] || 'd2';
      const department = { ...payload, id, manager: { id: 2, name: 'مسؤول الإدارة الجديدة', loginCode: payload.managerLoginCode } };
      const index = departments.findIndex(item => item.id === id);
      if (index === -1) departments.push(department); else departments[index] = department;
      return fulfill({ department });
    }
    if (endpoint === '/management/accounts') {
      const loginCode = url.searchParams.get('loginCode');
      return fulfill({ accounts: loginCode === '1483' ? [{ id: 2, name: 'مسؤول الإدارة الجديدة', loginCode, role: 'unassigned', departmentId: null }] : [{ id: 3, name: 'حساب إدارة أخرى', loginCode, role: 'admin', departmentId: 'other' }] });
    }
    if (endpoint === '/management/overview') return fulfill({ totals: { departments: departments.length, users: 3, students: 1, courses: 2, archives: 0 } });
    if (endpoint.startsWith('/management/archives')) return fulfill({ archives: [] });
    if (endpoint.startsWith('/dashboard')) {
      dashboardHeaders.push(request.headers());
      return fulfill(endpoint === '/dashboard/shell' ? shell : {});
    }
    if (endpoint === '/public/departments') return fulfill({ departments });
    return fulfill({});
  });
  return { writes, dashboardHeaders, setUser: next => { user = next; } };
}

async function expectNoOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

test('general manager creates an independent department using a verified registered account', async ({ page }, info) => {
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  const state = await mockSystem(page);
  await page.goto('management');
  await expect(page.getByRole('heading', { name: 'إدارة النظام', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'إضافة إدارة', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('اسم الإدارة', { exact: true }).fill('إدارة التدريب');
  await dialog.getByLabel('مسمى المسؤول').fill('مدير التدريب');
  await dialog.getByLabel('رقم دخول المسؤول').fill('1483');
  await expect(dialog.getByRole('button', { name: 'حفظ الإدارة' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'التحقق من الحساب' }).click();
  await expect(dialog.getByRole('status')).toContainText('مسؤول الإدارة الجديدة');
  await dialog.getByRole('button', { name: 'حفظ الإدارة' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'فتح إدارة التدريب', exact: true })).toBeVisible();
  expect(state.writes[0]).toMatchObject({ name: 'إدارة التدريب', managerLoginCode: '1483', managerTitle: 'مدير التدريب', isActive: true });
  await expectNoOverflow(page);
  const artifactDirectory = path.resolve('../.deploy/departments');
  mkdirSync(artifactDirectory, { recursive: true });
  await page.screenshot({ path: path.join(artifactDirectory, `${info.project.name}-management.png`), fullPage: true });
  await page.getByRole('button', { name: 'تعديل إدارة التدريب', exact: true }).click();
  await expect(dialog.getByLabel('مسمى المسؤول')).toHaveValue('مدير التدريب');
  await dialog.getByLabel('رقم دخول المسؤول').fill('1002');
  await dialog.getByRole('button', { name: 'التحقق من الحساب' }).click();
  await expect(dialog.getByRole('status')).toContainText('الحساب مرتبط بإدارة أخرى');
  await expect(dialog.getByRole('button', { name: 'حفظ الإدارة' })).toBeDisabled();
  expect(runtimeErrors).toEqual([]);
});

test('general manager enters department context and returns to central management', async ({ page }) => {
  const state = await mockSystem(page);
  await page.goto('management');
  await page.getByRole('button', { name: 'فتح الإدارة الحالية', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator('.department-context')).toHaveCount(0);
  await expect.poll(() => state.dashboardHeaders.length).toBeGreaterThan(0);
  expect(state.dashboardHeaders.every(headers => headers['x-department-id'] === 'd1')).toBe(true);
  if (page.viewportSize().width <= 1024) await page.getByRole('button', { name: 'فتح القائمة', exact: true }).click();
  await page.locator('.dashboard-sidebar').getByRole('button', { name: 'إدارة النظام', exact: true }).click();
  await expect(page).toHaveURL(/\/management$/);
  await expect(page.getByRole('heading', { name: 'إدارة النظام', exact: true })).toBeVisible();
});

test('registered accounts wait for assignment and cannot access system management', async ({ page }) => {
  const user = { id: 2, name: 'مسؤول بانتظار التعيين', loginCode: '1483', role: 'unassigned', mustChangePassword: false };
  const state = await mockSystem(page, user);
  await page.goto('management');
  await expect(page).toHaveURL(/\/account-assignment$/);
  await expect(page.getByRole('heading', { name: 'بانتظار تعيين الإدارة' })).toBeVisible();
  await expect(page.getByText('رقم الدخول:', { exact: false })).toContainText('1483');
  await expectNoOverflow(page);
  state.setUser({ ...user, role: 'admin', departmentId: 'd1', departmentName: 'الإدارة الحالية', roleLabel: 'مدير التدريب' });
  const sessionResponse = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/auth/session'));
  await page.getByRole('button', { name: 'التحقق من التعيين' }).click();
  expect((await (await sessionResponse).json()).user).toMatchObject({ departmentId: 'd1', departmentName: 'الإدارة الحالية', roleLabel: 'مدير التدريب' });
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator('.department-context')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'إدارة النظام', exact: true })).toHaveCount(0);
});


test('general manager alone creates responsible accounts and sees globally occupied numbers', async ({ page }) => {
  await mockSystem(page);
  const submissions = [];
  await page.route('**/api/auth/register-account', async route => {
    const payload = route.request().postDataJSON();
    submissions.push(payload);
    if (payload.loginCode === '1483') return route.fulfill({ status: 422, json: { message: 'رقم الدخول مستخدم مسبقًا.', errors: { loginCode: ['رقم الدخول مستخدم مسبقًا.'] } } });
    return route.fulfill({ status: 201, json: { message: 'حسابك جاهز.' } });
  });
  await page.goto('management');
  await page.getByRole('link', { name: 'إنشاء حساب مسؤول', exact: true }).click();
  await expect(page).toHaveURL(/\/register-account$/);
  await page.getByLabel('الاسم الكامل', { exact: true }).fill('مسؤول الإدارة الجديدة');
  await page.getByLabel('رقم الدخول').fill('1483');
  await page.locator('input[autocomplete="new-password"]').nth(0).fill('12345678');
  await page.locator('input[autocomplete="new-password"]').nth(1).fill('12345678');
  await page.getByRole('button', { name: 'إنشاء الحساب', exact: true }).click();
  await expect(page.locator('.account-entry__error')).toContainText('رقم الدخول مستخدم مسبقًا.');
  await page.getByLabel('رقم الدخول').fill('1484');
  await page.getByRole('button', { name: 'إنشاء الحساب', exact: true }).click();
  await expect(page).toHaveURL(/\/management$/);
  await expect(page.getByRole('heading', { name: 'إدارة النظام', exact: true })).toBeVisible();
  expect(submissions[1]).toMatchObject({ loginCode: '1484', name: 'مسؤول الإدارة الجديدة' });
  await expectNoOverflow(page);
});

test('guests see a blue login logo with no responsible registration and cannot open its URL', async ({ page }, info) => {
  await mockSystem(page, null);
  await page.goto('login');
  await expect(page.getByRole('heading', { name: 'الدخول إلى الحساب' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'إنشاء حساب مسؤول' })).toHaveCount(0);
  const programLogo = page.getByRole('img', { name: 'شعار البرنامج', exact: true });
  await expect(programLogo).toHaveCSS('filter', /brightness\(0\).*invert\(0\.24\)/);
  await expect.poll(() => programLogo.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  await expectNoOverflow(page);
  const artifactDirectory = path.resolve('../.deploy/departments');
  mkdirSync(artifactDirectory, { recursive: true });
  await page.screenshot({ path: path.join(artifactDirectory, `${info.project.name}-restricted-login.png`), fullPage: true });
  await page.goto('register-account');
  await expect(page).toHaveURL(/\/login\?redirect=.*register-account/);
  await expect(page.getByLabel('الاسم الكامل', { exact: true })).toHaveCount(0);
});

test('department administrators cannot open responsible account creation', async ({ page }) => {
  await mockSystem(page, { id: 2, name: 'مسؤول الإدارة', role: 'admin', departmentId: 'd1', mustChangePassword: false });
  await page.goto('register-account');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'إنشاء حساب مسؤول' })).toHaveCount(0);
});
