import { expect, test } from './support/isolatedTest.mjs';

test('results page searches, paginates and retains full attendance totals without a snapshot', async ({ page, request }, info) => {
  const api = `http://127.0.0.1:${process.env.E2E_BACKEND_PORT}/api`;
  const auth = await request.post(`${api}/auth/login`, { data: { login_code: process.env.E2E_ADMIN_LOGIN, password: process.env.E2E_ADMIN_PASSWORD } });
  const headers = { Accept: 'application/json', Authorization: `Bearer ${(await auth.json()).token}` };
  const prefix = `Results${info.project.name.replace(/[^a-z0-9]/gi, '')}`;
  const courseResponse = await request.post(`${api}/dashboard/courses`, { headers, data: { title: prefix, entityType: 'course', isActive: true } });
  expect(courseResponse.status()).toBe(201);
  const course = await courseResponse.json();
  const students = [];
  for (let i = 0; i < 21; i++) {
    const result = await request.post(`${api}/students`, { headers, data: { name: `${prefix} ${String(i).padStart(2, '0')}`, loginId: `${prefix}${i}`, branchId: 'male' } });
    expect(result.status()).toBe(201);
    students.push(await result.json());
  }
  const attendance = await request.post(`${api}/dashboard/manual-attendance`, { headers, data: {
    courseId: course.id, branchCode: 'male', presentStudents: students.slice(0, 20).map((student) => ({ studentName: student.name, loginId: student.loginId })),
  } });
  expect(attendance.ok()).toBe(true);
  let snapshots = 0;
  page.on('request', (request) => { if (request.url().includes('/dashboard/snapshot')) snapshots++; });
  await Promise.all([page.waitForResponse((response) => response.url().endsWith('/auth/session')), page.goto('login')]);
  await page.locator('input[autocomplete="username"]').fill(process.env.E2E_ADMIN_LOGIN);
  await page.locator('input[autocomplete="current-password"]').fill(process.env.E2E_ADMIN_PASSWORD);
  await Promise.all([page.waitForResponse((response) => response.url().endsWith('/dashboard/shell')), page.locator('form button[type="submit"]').click()]);
  await page.goto('dashboard?panel=results');
  await page.getByRole('combobox', { name: 'القسم', exact: true }).locator('..').click();
  await page.getByRole('option', { name: prefix, exact: true }).click();
  await page.getByRole('combobox', { name: 'نوع البيانات', exact: true }).locator('..').click();
  await page.getByRole('option', { name: 'الاختبار القبلي', exact: true }).click();
  await page.getByRole('searchbox').fill(prefix);
  await expect(page.locator('.results-pagination')).toContainText('عدد النتائج: 21');
  await expect(page.locator('.results-entry')).toHaveCount(20);
  await page.getByRole('button', { name: 'الصفحة التالية', exact: true }).click();
  await expect(page.locator('.results-entry')).toHaveCount(1);
  await page.getByRole('combobox', { name: 'نوع البيانات', exact: true }).locator('..').click();
  await page.getByRole('option', { name: 'التحضير', exact: true }).click();
  await expect(page.locator('.results-attendance-summary')).toContainText('عدد الحضور: 20');
  await expect(page.locator('.results-entry')).toHaveCount(20);
  const summary = await page.locator('.results-attendance-summary').innerText();
  await page.getByRole('button', { name: 'الصفحة التالية', exact: true }).click();
  await expect(page.locator('.results-entry')).toHaveCount(1);
  await expect(page.locator('.results-attendance-summary')).toHaveText(summary, { useInnerText: true });
  await page.getByRole('combobox', { name: 'حالة المعلمين', exact: true }).locator('..').click();
  await page.getByRole('option', { name: 'الغائبين', exact: true }).click();
  await expect(page.locator('.results-entry')).toHaveCount(1);
  expect(snapshots).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
});
