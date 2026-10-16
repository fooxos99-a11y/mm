import { expect, test } from './support/isolatedTest.mjs';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';

test.use({ actionTimeout: 20_000 });

const archiveId = '00000000-0000-0000-0000-000000000002';
const departmentId = '00000000-0000-0000-0000-000000000001';
const current = Array.from({ length: 26 }, (_, i) => ({ id: `s${i}`, full_name: `معلم حالي ${i + 1}`, login_code: `9400${i + 1}`, departmentId, departmentName: 'إدارة التدريب', branchName: 'معلمين', archive_id: null }));
const archived = { ...current[0], id: 'old', full_name: 'معلم من الدفعة السابقة', login_code: '83001', archive_id: archiveId, archive_name: 'دفعة العام السابق' };
const indicators = ['الحضور', 'الاختبار القبلي', 'الاختبار البعدي', 'المهام', 'عرض القرآن', 'الأجزاء المقروءة'].map((label, i) => ({ key: `i${i}`, label, display: '55%', progress: 55, meta: '55 من 100' }));

async function setup(page) {
  const state = { fail: false, requests: [] };
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const endpoint = url.pathname.split('/api')[1];
    const reply = body => route.fulfill({ json: body });
    if (endpoint === '/auth/session') return reply({ user: { id: 'root', name: 'المدير العام', role: 'super_admin', systemRole: 'super_admin', mustChangePassword: false } });
    if (endpoint === '/management/departments') return reply({ departments: [{ id: departmentId, name: 'إدارة التدريب', isActive: true }] });
    if (endpoint === '/management/overview') return reply({ totals: { departments: 1, users: 30, students: 26, courses: 20, archives: 1 }, indicators });
    if (endpoint === '/management/archives') return reply({ archives: [{ id: archiveId, name: 'دفعة العام السابق', departmentName: 'إدارة التدريب' }] });
    if (endpoint === '/management/records') {
      state.requests.push(Object.fromEntries(url.searchParams));
      if (state.fail) return route.fulfill({ status: 503, json: { message: 'تعذر تحميل السجلات.' } });
      const batch = url.searchParams.get('batch');
      let records = batch === 'current' ? current : batch === 'archived' ? [archived] : [...current, archived];
      const search = url.searchParams.get('search');
      if (search) records = records.filter(s => s.full_name.includes(search) || s.login_code.includes(search));
      const page = Number(url.searchParams.get('page') || 1);
      return reply({ students: records.slice((page - 1) * 25, page * 25), pagination: { total: records.length, page, perPage: 25, lastPage: Math.max(1, Math.ceil(records.length / 25)) } });
    }
    if (endpoint.startsWith('/management/students/') || /\/archives\/.+\/students\//.test(endpoint)) {
      const student = endpoint.includes('/archives/') ? archived : current.find(s => endpoint.endsWith(`/${s.id}`));
      return reply({ archive: { id: student.archive_id, name: student.archive_name || 'الدفعة الحالية' }, student: { name: student.full_name, loginCode: student.login_code, branchName: student.branchName, completedParts: [1, 2] }, summary: { attendance: 3, tasks: 2, preTests: 2, postTests: 1 }, courses: [{ id: 'c1', title: 'دورة التعليم', attendance: { isPresent: true }, pre: { manualScore: 9 }, post: null, tasks: { manualScore: 0 } }] });
    }
    return reply({});
  });
  return state;
}

async function openRecords(page) {
  if (page.viewportSize().width <= 1024) await page.getByRole('button', { name: 'فتح القائمة', exact: true }).click();
  await page.getByRole('navigation', { name: 'أقسام إدارة النظام' }).getByRole('button', { name: 'الأرشيف المركزي', exact: true }).click();
}
async function capture(page, info, name) {
  const directory = path.resolve('../.deploy/departments');
  mkdirSync(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, `${info.project.name}-redesign-${name}.png`), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

test('management dashboard has round indicators and automatically browses current and archived records', async ({ page }, info) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const state = await setup(page);
  await page.goto('management');
  await expect(page.getByRole('heading', { name: 'إدارة النظام', exact: true })).toBeVisible();
  const rings = page.locator('.system-management__indicators .dashboard-indicator-ring');
  await expect(rings).toHaveCount(6);
  for (const ring of await rings.all()) {
    const box = await ring.boundingBox();
    expect(Math.abs(box.width - box.height)).toBeLessThanOrEqual(1);
  }
  await capture(page, info, 'overview');
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
  await openRecords(page);
  await expect(page.getByText(current[0].full_name, { exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('26 سجل');
  expect(state.requests[0].batch).toBe('current');
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'الصفحة التالية' }).click();
  await expect(page.getByText(current[25].full_name, { exact: true })).toBeVisible();
  await page.getByLabel('الاسم أو رقم الدخول').fill('94001');
  await page.getByRole('button', { name: 'بحث', exact: true }).click();
  await page.getByRole('button', { name: `عرض سجل ${current[0].full_name}`, exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('سجل المعلم');
  await expect(dialog).toContainText('دورة التعليم');
  await expect(dialog.locator('td[data-label="المهام"]')).toHaveText('0');
  await dialog.getByRole('button', { name: 'إغلاق', exact: true }).click();
  await page.getByLabel('الاسم أو رقم الدخول').fill('');
  await page.getByRole('button', { name: 'بحث', exact: true }).click();
  await page.locator('.app-select').filter({ has: page.getByRole('combobox', { name: 'الدفعة', exact: true }) }).locator('.v-field').click();
  await page.getByRole('option', { name: 'دفعة العام السابق · إدارة التدريب', exact: true }).click();
  await expect(page.getByText(archived.full_name, { exact: true })).toBeVisible();
  expect(state.requests.at(-1)).toMatchObject({ batch: 'archived', archiveId });
  await capture(page, info, 'records');
  await page.getByRole('button', { name: `عرض سجل ${archived.full_name}`, exact: true }).click();
  await expect(dialog).toContainText('سجل المعلم المؤرشف');
  expect(errors).toEqual([]);
});

test('central records recover from failures and clearly report an empty search', async ({ page }) => {
  const state = await setup(page);
  state.fail = true;
  await page.goto('management');
  await openRecords(page);
  await expect(page.getByText('تعذر تحميل السجلات.', { exact: true })).toBeVisible();
  state.fail = false;
  await page.getByRole('button', { name: /إعادة المحاولة|حاول مرة أخرى/ }).click();
  await expect(page.getByText(current[0].full_name, { exact: true })).toBeVisible();
  await page.getByLabel('الاسم أو رقم الدخول').fill('اسم غير موجود');
  await page.getByRole('button', { name: 'بحث', exact: true }).click();
  await expect(page.getByText('لا توجد سجلات لهذه التصفية', { exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('0 سجل');
});
