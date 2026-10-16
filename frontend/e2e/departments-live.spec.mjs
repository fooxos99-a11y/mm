import { expect, test } from './support/isolatedTest.mjs';
import { adminLogin, adminPassword, rolePassword, studentPassword } from './support/credentials.mjs';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

test.use({ actionTimeout: 20_000 });

const apiOrigin = new URL(process.env.VUE_APP_API_BASE_URL).origin;
async function loginAs(page, loginCode, password, home) {
  await page.goto('about:blank');
  await page.context().clearCookies();
  await page.goto('login');
  await page.locator('[autocomplete="username"]').fill(loginCode);
  await page.locator('[autocomplete="current-password"]').fill(password);
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(new RegExp(`/${home}$`));
}
async function apiHeaders(page) {
  const token = (await page.context().cookies(apiOrigin)).find(cookie => cookie.name === 'XSRF-TOKEN');
  return { Accept: 'application/json', Referer: page.url(), 'X-XSRF-TOKEN': decodeURIComponent(token?.value || '') };
}
async function screenshot(page, name) {
  const directory = path.resolve('../.deploy/departments');
  mkdirSync(directory, { recursive: true });
  await expect(page.locator('.Vue-Toastification__toast')).toHaveCount(0);
  await page.screenshot({ path: path.join(directory, name), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

test('live department assignment, teacher login and global number uniqueness share one site', async ({ page }, info) => {
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  const name = `إدارة التدريب ${info.project.name}`;
  await loginAs(page, 'e2e-general-manager', rolePassword, 'management');
  await page.getByRole('button', { name: 'إضافة إدارة', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('اسم الإدارة', { exact: true }).fill(name);
  await dialog.getByLabel('مسمى المسؤول').fill('مدير التدريب');
  await dialog.getByLabel('رقم دخول المسؤول').fill('e2ependingmanager');
  await dialog.getByRole('button', { name: 'التحقق من الحساب' }).click();
  await expect(dialog.getByRole('status')).toContainText('e2ependingmanager');
  await dialog.getByRole('button', { name: 'حفظ الإدارة' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: `فتح ${name}`, exact: true })).toBeVisible();
  await screenshot(page, `${info.project.name}-live-management.png`);
  await page.getByRole('button', { name: `فتح ${name}`, exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator('.department-context')).toHaveCount(0);
  if (page.viewportSize().width <= 1024) await page.getByRole('button', { name: 'فتح القائمة', exact: true }).click();
  await page.locator('.dashboard-sidebar').getByRole('button', { name: 'إدارة النظام', exact: true }).click();
  await expect(page).toHaveURL(/\/management$/);

  await loginAs(page, 'e2ependingmanager', rolePassword, 'dashboard');
  await expect(page.locator('.department-context')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'إدارة النظام', exact: true })).toHaveCount(0);
  const headers = await apiHeaders(page);
  const managerSession = await page.request.get(`${apiOrigin}/api/auth/session`, { headers });
  expect(managerSession.ok()).toBe(true);
  const managerUser = (await managerSession.json()).user;
  expect(managerUser).toMatchObject({ departmentName: name, role: 'admin', roleLabel: 'مدير التدريب' });
  expect(managerUser.departmentId).toBeTruthy();
  const teacher = await page.request.post(`${apiOrigin}/api/students`, { headers, data: { name: 'معلم الإدارة الجديدة', loginId: '0924', branchId: 'male', password: studentPassword, passwordConfirmation: studentPassword } });
  expect(teacher.status(), await teacher.text()).toBe(201);
  const courseTitle = `دورة الإدارة المستقلة ${info.project.name}`;
  const course = await page.request.post(`${apiOrigin}/api/dashboard/courses`, { headers, data: { title: courseTitle, isActive: true } });
  expect(course.status(), await course.text()).toBe(201);
  const denied = await page.request.get(`${apiOrigin}/api/management/departments`, { headers });
  expect(denied.status()).toBe(403);
  await screenshot(page, `${info.project.name}-live-department-manager.png`);

  await loginAs(page, '0924', studentPassword, 'student');
  await expect(page.locator('.student-page')).toBeVisible();
  await expect(page.locator('.department-context')).toHaveCount(0);
  const teacherSession = await page.request.get(`${apiOrigin}/api/auth/session`, { headers: await apiHeaders(page) });
  expect(teacherSession.ok()).toBe(true);
  expect((await teacherSession.json()).user).toMatchObject({ departmentId: managerUser.departmentId, departmentName: name, role: 'student' });
  const snapshot = await page.request.get(`${apiOrigin}/api/dashboard/snapshot`, { headers: await apiHeaders(page) });
  expect(snapshot.ok()).toBe(true);
  const studentData = await snapshot.json();
  expect(studentData.students.map(student => student.loginId)).toEqual(['0924']);
  expect(studentData.courses.some(course => course.title === courseTitle)).toBe(true);
  await expect(page.locator('.student-page .dashboard-topbar__name')).toHaveText('معلم الإدارة الجديدة');
  await expect(page.locator('.student-page .dashboard-loader-shell')).toHaveCount(0);
  await expect(page.locator('.student-page .dashboard-error')).toHaveCount(0);
  await screenshot(page, `${info.project.name}-live-department-teacher.png`);

  await loginAs(page, adminLogin, adminPassword, 'dashboard');
  const defaultHeaders = await apiHeaders(page);
  const duplicate = await page.request.post(`${apiOrigin}/api/students`, { headers: defaultHeaders, data: { name: 'محاولة تكرار رقم الدخول', loginId: '0924', branchId: 'male', password: studentPassword, passwordConfirmation: studentPassword } });
  expect(duplicate.status()).toBe(422);
  const defaultSnapshot = await page.request.get(`${apiOrigin}/api/dashboard/snapshot`, { headers: defaultHeaders });
  const defaultData = await defaultSnapshot.json();
  expect(defaultData.courses.some(course => course.title === courseTitle)).toBe(false);
  expect(defaultData.students.some(student => student.loginId === '0924')).toBe(false);
  await loginAs(page, 'e2e-general-manager', rolePassword, 'management');
  if (page.viewportSize().width <= 1024) await page.getByRole('button', { name: 'فتح القائمة', exact: true }).click();
  await page.getByRole('navigation', { name: 'أقسام إدارة النظام' }).getByRole('button', { name: 'الأرشيف المركزي', exact: true }).click();
  await page.getByLabel('الاسم أو رقم الدخول').fill('0924');
  await page.getByRole('button', { name: 'بحث', exact: true }).click();
  await expect(page.getByText('معلم الإدارة الجديدة', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'عرض سجل معلم الإدارة الجديدة', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(courseTitle);
  expect(runtimeErrors).toEqual([]);
});
