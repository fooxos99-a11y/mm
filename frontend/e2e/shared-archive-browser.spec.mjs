import { expect, test } from './support/isolatedTest.mjs';
import { rolePassword } from './support/credentials.mjs';
import { login, selectOption } from './support/gesture-helpers.mjs';

const apiOrigin = new URL(process.env.VUE_APP_API_BASE_URL).origin;

async function api(page, path, { method = 'GET', data } = {}) {
  const cookie = (await page.context().cookies(apiOrigin)).find(item => item.name === 'XSRF-TOKEN');
  return page.request.fetch(`${apiOrigin}/api${path}`, {
    method, data,
    headers: { Accept: 'application/json', Referer: page.url(), 'X-XSRF-TOKEN': decodeURIComponent(cookie?.value || '') },
  });
}

async function signIn(page, loginCode) {
  await page.goto('about:blank');
  await page.context().clearCookies();
  await login(page, loginCode, rolePassword);
}

async function openArchives(page) {
  await page.goto('dashboard?panel=settings&settingsItem=archive');
  await expect(page.locator('.admin-archive-view')).toBeVisible();
}

test('department archives are shared in the browser while foreign records remain read only', async ({ page }, info) => {
  test.setTimeout(180_000);
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));

  await signIn(page, 'e2e-general-manager');
  for (const marker of ['A', 'B']) {
    const response = await api(page, '/management/departments', { method: 'POST', data: {
      name: `إدارة مشاركة الأرشيف ${marker}`, managerTitle: `مسؤول الإدارة ${marker}`,
      managerLoginCode: `shared-archive-${marker}-${info.project.name}`, managerPassword: rolePassword,
    } });
    expect(response.status(), await response.text()).toBe(201);
  }

  await signIn(page, `shared-archive-A-${info.project.name}`);
  const liveName = 'معلم حالي خاص بالإدارة الأولى';
  const liveCourse = 'دورة حالية خاصة بالإدارة الأولى';
  const createdTeacher = await api(page, '/students', { method: 'POST', data: {
    name: liveName, loginId: 'shared-archive-live-teacher', branchId: 'male',
    password: rolePassword, passwordConfirmation: rolePassword,
  } });
  expect(createdTeacher.status(), await createdTeacher.text()).toBe(201);
  const createdCourse = await api(page, '/dashboard/courses', { method: 'POST', data: { title: liveCourse, isActive: true } });
  expect(createdCourse.status(), await createdCourse.text()).toBe(201);

  await openArchives(page);
  await page.locator('.dashboard-topbar').getByRole('button', { name: 'إضافة', exact: true }).click();
  const createDialog = page.getByRole('dialog', { name: 'إضافة أرشيف جديد', exact: true });
  const archiveName = `دفعة مشتركة ${info.project.name}`;
  await createDialog.getByLabel('اسم الأرشيف', { exact: true }).fill(archiveName);
  const counts = { 'courses-count': 2, 'tasks-count': 4, 'male-teachers-count': 5, 'female-teachers-count': 6, 'completed-parts-count': 7 };
  for (const [field, value] of Object.entries(counts)) {
    await createDialog.locator(`#archive-create-${field}`).fill(String(value));
  }
  const createResponse = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/dashboard/archives')
    && response.request().method() === 'POST');
  await createDialog.getByRole('button', { name: 'إضافة', exact: true }).click();
  const saved = await createResponse;
  expect(saved.status(), await saved.text()).toBe(201);
  const archive = await saved.json();
  expect(archive.can_manage).toBe(true);
  await expect(createDialog).not.toBeVisible();

  const archivedName = 'معلم مؤرشف مشترك من الإدارة الأولى';
  const addedStudent = await api(page, `/dashboard/archives/${archive.id}/students`, { method: 'POST', data: { name: archivedName } });
  expect(addedStudent.ok(), await addedStudent.text()).toBe(true);
  const studentId = (await addedStudent.json()).student.id;
  await openArchives(page);
  await expect(page.getByRole('button', { name: archivedName, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: `حذف الأرشيف ${archiveName}`, exact: true })).toBeVisible();

  await signIn(page, `shared-archive-B-${info.project.name}`);
  const snapshot = await api(page, '/dashboard/snapshot');
  expect(snapshot.status(), await snapshot.text()).toBe(200);
  const liveData = await snapshot.json();
  expect(liveData.students.some(student => student.name === liveName || student.loginId === 'shared-archive-live-teacher')).toBe(false);
  expect(liveData.courses.some(course => course.title === liveCourse)).toBe(false);

  const catalog = await api(page, '/dashboard/archives');
  expect(catalog.status(), await catalog.text()).toBe(200);
  expect((await catalog.json()).find(item => item.id === archive.id)).toMatchObject({ name: archiveName, can_manage: false, department_name: 'إدارة مشاركة الأرشيف A' });
  await openArchives(page);
  await page.locator('.admin-archive-view__select .v-field').click();
  await selectOption(page, `${archiveName} — إدارة مشاركة الأرشيف A`, { exact: true });
  await expect(page.locator('.admin-archive-view__summary')).toHaveCount(0);
  await expect(page.locator('#archive-record-filter')).toHaveValue(`${archiveName} — إدارة مشاركة الأرشيف A`);
  await expect(page.getByRole('button', { name: `حذف الأرشيف ${archiveName}`, exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'إضافة طالب إلى الأرشيف', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: archivedName, exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

  const searchResponse = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/archives/search/students'));
  await page.getByRole('searchbox', { name: 'البحث باسم الطالب', exact: true }).fill(archivedName);
  const searched = await searchResponse;
  expect(searched.status(), await searched.text()).toBe(200);
  expect(await searched.json()).toEqual(expect.arrayContaining([expect.objectContaining({ id: studentId, archive_id: archive.id, archive_name: archiveName })]));
  await expect(page.getByRole('heading', { name: 'نتائج البحث', exact: true })).toBeVisible();
  await page.getByRole('button', { name: archivedName, exact: true }).click();
  const detailDialog = page.getByRole('dialog', { name: 'سجل المعلم المؤرشف', exact: true });
  await expect(detailDialog.locator('.admin-archive-view__details-name')).toHaveText(archivedName);
  await expect(detailDialog).toContainText('أضيف يدويًا داخل الأرشيف');
  await detailDialog.getByRole('button', { name: 'إغلاق', exact: true }).click();

  const deniedAdd = await api(page, `/dashboard/archives/${archive.id}/students`, { method: 'POST', data: { name: 'محاولة كتابة غير مصرح بها' } });
  expect([403, 404]).toContain(deniedAdd.status());
  const deniedDelete = await api(page, `/dashboard/archives/${archive.id}`, { method: 'DELETE' });
  expect([403, 404]).toContain(deniedDelete.status());
  const unchanged = await api(page, `/dashboard/archives/${archive.id}`);
  expect(unchanged.status(), await unchanged.text()).toBe(200);
  const unchangedData = await unchanged.json();
  expect(unchangedData.archive).toMatchObject({ id: archive.id, name: archiveName, can_manage: false, courses_count: 2, tasks_count: 4 });
  expect(unchangedData.students.map(student => student.id)).toEqual([studentId]);
  expect(runtimeErrors).toEqual([]);
});
