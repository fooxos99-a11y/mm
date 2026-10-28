import { expect, test } from './support/isolatedTest.mjs';
import { settingsAppearance } from './support/settings-appearance.mjs';
import { login, selectOption } from './support/gesture-helpers.mjs';
import { adminLogin, adminPassword, studentPassword } from './support/credentials.mjs';

async function chooseSelfAttendance(page, label) {
  await expect(page.locator('#attendance-settings-enabled')).toBeEnabled();
  await page.locator('.app-select').filter({ has: page.locator('#attendance-settings-enabled') }).locator('.v-field').click();
  await selectOption(page, label, { exact: true });
}

test('branch roster remains available with no course enrollments after opening attendance', async ({ page, request }, info) => {
  test.setTimeout(180000);
  const api = `http://127.0.0.1:${process.env.E2E_BACKEND_PORT}/api`;
  const auth = await request.post(`${api}/auth/login`, { data: { login_code: adminLogin, password: adminPassword } });
  const headers = { Authorization: `Bearer ${(await auth.json()).token}` };
  const call = async (method, path, data, status = 200) => {
    const response = await request.fetch(`${api}/${path}`, { method, data, headers });
    expect(response.status(), `${path}: ${await response.text()}`).toBe(status);
    return status === 204 ? null : response.json();
  };
  const course = await call('POST', 'dashboard/courses', { title: 'دورة دون تسجيلات', isActive: false }, 201);
  const female = await call('POST', 'students', { name: 'معلمة فحص قائمة الفرع', loginId: 'roster-female', branchId: 'female',
    password: studentPassword, passwordConfirmation: studentPassword }, 201);
  const snapshot = await call('GET', 'dashboard/snapshot');
  const males = snapshot.students.filter(student => student.branchId === 'male');
  const females = snapshot.students.filter(student => student.branchId === 'female');
  expect(males.length).toBeGreaterThan(0);
  await call('POST', 'dashboard/manual-attendance', { courseId: course.id, branchCode: 'male', presentStudents: [
    { loginId: males[0].loginId, studentName: males[0].name },
  ] }, 204);
  const legacy = (await call('GET', 'dashboard/snapshot')).attendance.find(record => record.courseId === course.id);
  expect((await call('GET', `dashboard/courses/${course.id}/enrollments?branchCode=male`)).studentIds).toEqual([]);
  // A failed enrollment endpoint must not hide the supervisor's branch roster.
  await page.route('**/enrollments?**', route => route.fulfill({ status: 503, json: { message: 'تعذر تحميل التسجيلات' } }));
  await login(page);
  await page.goto(`dashboard?panel=courses&courseId=${course.id}`);
  const rows = page.locator('.assessment-attendance__row');
  await expect(rows).toHaveCount(males.length);
  await page.getByRole('button', { name: 'فتح التحضير', exact: true }).click();
  const dialog = page.getByRole('dialog').filter({ hasText: 'مدة فتح التحضير' });
  await dialog.getByLabel('مدة فتح التحضير', { exact: true }).fill('2');
  await dialog.getByRole('button', { name: 'فتح التحضير', exact: true }).click();
  await expect(page.getByRole('button', { name: 'إغلاق التحضير', exact: true })).toBeEnabled();
  await expect(rows).toHaveCount(males.length);
  const row = rows.filter({ hasText: males[0].name });
  await expect(row.getByRole('button')).toHaveText('تحضير');
  const history = page.locator('.attendance-history');
  await expect(history.locator('summary')).toHaveText('سجلات الحضور السابقة (1)');
  await history.locator('summary').click();
  await expect(history.getByText(males[0].name, { exact: true })).toBeVisible();
  const saved = page.waitForResponse(response => response.url().endsWith('/manual-attendance') && response.request().method() === 'POST');
  await row.getByRole('button').click();
  expect((await saved).status()).toBe(204);
  await expect(row.getByRole('button')).toHaveText('حاضر');
  expect((await call('GET', 'dashboard/snapshot')).attendance.find(record => record.id === legacy.id)).toEqual(legacy);
  await page.reload();
  await expect(rows).toHaveCount(males.length);
  await expect(row.getByRole('button')).toHaveText('حاضر');
  await page.locator('#assessment-attendance-branch').press('ArrowDown');
  await selectOption(page, 'معلمات', { exact: true });
  await expect(rows).toHaveCount(females.length);
  await expect(rows.filter({ hasText: female.name })).toBeVisible();
  await expect(history).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'لا يوجد معلمون في هذا الفرع', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'إغلاق التحضير', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'إغلاق التحضير', exact: true }).click();
  await expect(rows).toHaveCount(females.length);
  for (const button of await rows.getByRole('button').all()) await expect(button).toBeEnabled();
  const closedSave = page.waitForResponse(response => response.url().endsWith('/manual-attendance') && response.request().method() === 'POST');
  await rows.filter({ hasText: female.name }).getByRole('button').click();
  expect((await closedSave).status()).toBe(204);
  await expect(rows.filter({ hasText: female.name }).getByRole('button')).toHaveText('حاضر');
  expect((await call('GET', `dashboard/courses/${course.id}/enrollments?branchCode=male`)).studentIds).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: info.outputPath('attendance-roster-preserved.png'), fullPage: true });
});

test('attendance settings persist both switch states', async ({ page }, info) => {
  await login(page);
  await page.goto('dashboard?panel=settings&settingsItem=permissions', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'الإشراف', exact: true })).toBeVisible();
  await expect(page.locator('.permissions-admin .app-settings-panel__header').getByRole('button', { name: 'إضافة', exact: true })).toBeEnabled();
  const reference = await settingsAppearance(page, '.permissions-admin__card', 'إضافة');
  await page.screenshot({ path: info.outputPath('supervision-reference.png') });
  const url = 'dashboard?panel=settings&settingsItem=attendance';
  await page.goto(url);
  await expect(page.locator('#attendance-settings-enabled')).toBeEnabled();
  expect(await settingsAppearance(page, '.attendance-admin__card', 'حفظ')).toEqual(reference);
  await expect(page.locator('.attendance-admin .app-settings-panel__header').getByRole('button', { name: 'حفظ', exact: true })).toBeEnabled();
  await expect(page.locator('.attendance-admin .app-filter-field')).toHaveCount(3);
  await expect(page.locator('.attendance-admin p')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  await chooseSelfAttendance(page, 'تشغيل');
  await page.getByLabel('موقع التحضير', { exact: true }).fill('https://www.google.com/maps?q=24.7136,46.6753');
  await page.getByLabel('نطاق التحضير (متر)', { exact: true }).fill('450');
  const save = async () => {
    const response = page.waitForResponse(row => row.url().endsWith('/dashboard/attendance/settings') && row.request().method() === 'PUT');
    await page.getByRole('button', { name: 'حفظ', exact: true }).click();
    expect((await response).status()).toBe(200);
  };
  await save();
  await page.goto(url);
  await expect(page.locator('#attendance-settings-enabled')).toBeEnabled();
  await expect(page.locator('.app-select').filter({ has: page.locator('#attendance-settings-enabled') }).locator('.v-select__selection-text')).toHaveText('تشغيل');
  await expect(page.getByLabel('نطاق التحضير (متر)', { exact: true })).toHaveValue('450');
  await page.screenshot({ path: info.outputPath('attendance-settings-final.png') });
  await chooseSelfAttendance(page, 'إيقاف');
  await save();
  await page.goto(url);
  await expect(page.locator('#attendance-settings-enabled')).toBeEnabled();
  await expect(page.locator('.app-select').filter({ has: page.locator('#attendance-settings-enabled') }).locator('.v-select__selection-text')).toHaveText('إيقاف');
});

test('course sessions, settings, student location, history and supervision', async ({ page, request, context, browser }, info) => {
  test.setTimeout(360000);
  const api = `http://127.0.0.1:${process.env.E2E_BACKEND_PORT}/api`;
  const auth = await request.post(`${api}/auth/login`, { data: { login_code: adminLogin, password: adminPassword } });
  const headers = { Authorization: `Bearer ${(await auth.json()).token}` };
  const call = async (method, path, data, status = 200) => {
    const response = await request.fetch(`${api}/${path}`, { method, data, headers });
    expect(response.status(), `${path}: ${await response.text()}`).toBe(status);
    return status === 204 ? null : response.json();
  };
  const student = await call('POST', 'students', { name: 'طالب فحص التحضير', loginId: 'attendance-student',
    branchId: 'male', password: studentPassword, passwordConfirmation: studentPassword }, 201);
  const unenrolled = await call('POST', 'students', { name: 'معلم بدون تسجيل في الدورة', loginId: 'attendance-unenrolled',
    branchId: 'male', password: studentPassword, passwordConfirmation: studentPassword }, 201);
  const course = await call('POST', 'dashboard/courses', { title: 'دورة التحضير', isActive: false }, 201);
  const other = await call('POST', 'dashboard/courses', { title: 'الدورة الثانية', isActive: false }, 201);
  await call('PUT', `dashboard/courses/${course.id}/enrollments`, { branchCode: 'male', studentIds: [student.id] });
  await login(page);
  await page.goto('dashboard?panel=settings&settingsItem=attendance');
  await expect(page.getByRole('heading', { name: 'التحضير', exact: true })).toBeVisible();
  await chooseSelfAttendance(page, 'تشغيل');
  await page.getByLabel('موقع التحضير', { exact: true }).fill('https://www.google.com/maps?q=24.7136,46.6753');
  await expect(page.getByLabel('نطاق التحضير (متر)', { exact: true })).toHaveValue('300');
  await page.getByRole('button', { name: 'حفظ', exact: true }).click();
  await expect.poll(async () => (await call('GET', 'dashboard/attendance/settings')).enabled).toBe(true);
  await page.screenshot({ path: info.outputPath('attendance-settings.png'), fullPage: false });

  await page.goto(`dashboard?panel=courses&courseId=${course.id}`);
  const rosterCount = (await call('GET', 'dashboard/snapshot')).students.filter(student => student.branchId === 'male').length;
  await expect(page.locator('.assessment-attendance__row')).toHaveCount(rosterCount);
  const unenrolledRow = page.locator('.assessment-attendance__row').filter({ hasText: unenrolled.name });
  await expect(unenrolledRow).toBeVisible();
  await expect(page.getByLabel('جلسة التحضير', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'طلاب الدورة', exact: true })).toHaveCount(0);
  const header = page.locator('.dashboard-topbar');
  await expect(header.getByRole('button', { name: 'فتح التحضير', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'فتح التحضير', exact: true })).toHaveCount(1);
  await expect(page.locator('.prep-card').getByRole('button', { name: 'فتح التحضير', exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'فتح التحضير', exact: true }).click();
  const dialog = page.getByRole('dialog').filter({ hasText: 'مدة فتح التحضير' });
  await expect(dialog.getByLabel('الدورة', { exact: true })).toHaveValue(course.title);
  await dialog.getByLabel('مدة فتح التحضير', { exact: true }).fill('2.5');
  await page.screenshot({ path: info.outputPath('attendance-open.png'), fullPage: false });
  await dialog.getByRole('button', { name: 'فتح التحضير', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'إغلاق التحضير', exact: true })).toBeVisible();
  await expect(header.getByRole('button', { name: 'إغلاق التحضير', exact: true })).toBeEnabled();
  const [session] = await call('GET', `dashboard/courses/${course.id}/attendance-sessions`);
  expect(session.hours).toBe(2.5);
  await expect(page.locator('.assessment-attendance__row')).toHaveCount(rosterCount);
  await expect(page.getByRole('heading', { name: 'لا يوجد معلمون في هذا الفرع', exact: true })).toHaveCount(0);
  const markUnenrolled = page.waitForResponse(response => response.url().endsWith('/manual-attendance') && response.request().method() === 'POST');
  await unenrolledRow.getByRole('button').click();
  expect((await markUnenrolled).status()).toBe(204);
  await expect(unenrolledRow.getByRole('button')).toHaveText('حاضر');
  const unmarkUnenrolled = page.waitForResponse(response => response.url().endsWith('/manual-attendance') && response.request().method() === 'POST');
  await unenrolledRow.getByRole('button').click();
  expect((await unmarkUnenrolled).status()).toBe(204);
  expect((await call('GET', `dashboard/courses/${course.id}/enrollments?branchCode=male`)).studentIds).toEqual([student.id]);
  expect(await call('GET', `dashboard/courses/${other.id}/attendance-sessions`)).toEqual([]);
  const otherSession = await call('POST', `dashboard/courses/${other.id}/attendance-sessions`, { hours: 1.25 }, 201);
  const adminStorage = await context.storageState();

  await page.goto('about:blank'); await context.clearCookies();
  await login(page, 'attendance-student', studentPassword);
  await page.goto('practitioner');
  await page.getByRole('button', { name: 'الحساب', exact: true }).click();
  await page.getByRole('button', { name: 'التحضير', exact: true }).click();
  const attendance = page.getByRole('dialog').filter({ hasText: 'تسجيل الحضور' });
  const studentHeaders = { Referer: page.url(), Accept: 'application/json',
    'X-XSRF-TOKEN': decodeURIComponent((await context.cookies(api)).find(cookie => cookie.name === 'XSRF-TOKEN')?.value || '') };
  const available = await page.request.get(`${api}/students/me/attendance`, { headers: studentHeaders });
  expect(available.status()).toBe(200);
  expect((await available.json()).map(row => row.courseId)).toEqual([course.id]);
  const denied = await page.request.post(`${api}/students/me/attendance/${other.id}/${otherSession.id}/challenge`, { headers: studentHeaders });
  expect(denied.status()).toBe(403);
  await expect(attendance.getByLabel('الدورة', { exact: true })).toHaveValue(course.title);
  await call('PUT', `dashboard/courses/${other.id}/enrollments`, { branchCode: 'male', studentIds: [student.id] });

  await expect(attendance.getByLabel('الدورة', { exact: true })).toBeVisible();
  await attendance.getByLabel('الدورة', { exact: true }).selectOption(session.id);
  await expect(attendance.getByLabel('مدة فتح التحضير')).toHaveValue('2.5');

  let location = null;
  // DevTools fixes carry their assignment timestamp. Assign after the real server challenge
  // so the test exercises fresh sensor samples rather than stale emulated coordinates.
  await page.route('**/api/students/me/attendance/**/challenge', async route => {
    const response = await route.fetch();
    if (location) await context.setGeolocation(location);
    await route.fulfill({ response });
  });
  // A denied browser permission must produce no attendance record.
  await context.clearPermissions();
  await context.grantPermissions([], { origin: new URL(page.url()).origin });
  await attendance.getByRole('button', { name: 'تسجيل الحضور', exact: true }).click();
  await expect(attendance.getByRole('alert')).toContainText('لم يُسمح');

  await context.grantPermissions(['geolocation'], { origin: new URL(page.url()).origin });
  location = { latitude: 25, longitude: 46.6753, accuracy: 10 };
  await attendance.getByRole('button', { name: 'تسجيل الحضور', exact: true }).click();
  await expect(attendance.getByRole('alert')).toContainText('خارج نطاق');
  location = { latitude: 24.7136, longitude: 46.6753, accuracy: 150 };
  await attendance.getByRole('button', { name: 'تسجيل الحضور', exact: true }).click();
  await expect(attendance.getByRole('alert')).toContainText('دقة الموقع');
  location = { latitude: 24.7136, longitude: 46.6753, accuracy: 10 };
  await attendance.getByRole('button', { name: 'تسجيل الحضور', exact: true }).click();
  await expect(attendance.getByRole('status')).toHaveText('تم تسجيل الحضور');
  await expect(attendance.getByRole('button', { name: 'تسجيل الحضور', exact: true })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('attendance-student.png'), fullPage: false });

  // A stale supervisor checklist cannot erase or duplicate the student's record.
  await call('POST', 'dashboard/manual-attendance', { courseId: course.id, sessionId: session.id, presentStudents: [
    { loginId: 'attendance-student', studentId: student.id, studentName: student.name },
  ] }, 204);
  const snapshot = await call('GET', 'dashboard/snapshot');
  expect(snapshot.attendance.filter(row => row.sessionId === session.id && row.loginId === 'attendance-student')).toHaveLength(1);
  expect(snapshot.attendance.find(row => row.sessionId === session.id).source).toBe('student');
  const staffContext = await browser.newContext({ baseURL: process.env.E2E_BASE_URL, storageState: adminStorage,
    viewport: info.project.use.viewport, isMobile: info.project.use.isMobile, hasTouch: info.project.use.hasTouch });
  const staffPage = await staffContext.newPage();
  await staffPage.goto(`dashboard?panel=courses&courseId=${course.id}`);
  const row = staffPage.locator('.assessment-attendance__row').filter({ hasText: student.name });
  await expect(staffPage.locator('.assessment-attendance__row')).toHaveCount(rosterCount);
  const toggleStudent = row.getByRole('button');
  await expect(toggleStudent).toHaveText('حاضر');
  const cancelResponse = staffPage.waitForResponse(response => response.url().endsWith('/manual-attendance') && response.request().method() === 'POST');
  await toggleStudent.click();
  const cancelled = await cancelResponse;
  expect(cancelled.status()).toBe(204);
  expect(cancelled.request().postDataJSON().removedStudents).toEqual(['attendance-student']);
  expect((await call('GET', 'dashboard/snapshot')).attendance.filter(record => record.sessionId === session.id)).toHaveLength(0);
  await expect(toggleStudent).toBeEnabled();
  const restoreResponse = staffPage.waitForResponse(response => response.url().endsWith('/manual-attendance') && response.request().method() === 'POST');
  await toggleStudent.click();
  expect((await restoreResponse).status()).toBe(204);
  await expect(toggleStudent).toHaveText('حاضر');
  const restored = (await call('GET', 'dashboard/snapshot')).attendance.filter(record => record.sessionId === session.id);
  expect(restored).toHaveLength(1);
  expect(restored[0].hours).toBe(2.5);
  // Closing must update from the successful write, even when subsequent refreshes are unavailable.
  await staffPage.route('**/attendance-sessions', route => route.request().method() === 'GET'
    ? route.fulfill({ status: 503, json: { message: 'تعذر التحديث' } }) : route.continue());
  await staffPage.route('**/enrollments?**', route => route.fulfill({ status: 503, json: { message: 'تعذر التحديث' } }));
  const closeResponse = staffPage.waitForResponse(response => response.url().endsWith(`/${session.id}/close`) && response.request().method() === 'POST');
  await staffPage.getByRole('button', { name: 'إغلاق التحضير', exact: true }).click();
  expect((await closeResponse).status()).toBe(204);
  await expect(toggleStudent).toBeEnabled();
  await staffPage.screenshot({ path: info.outputPath('attendance-supervision.png') });
  await staffContext.close();

  await attendance.getByRole('button', { name: 'إغلاق', exact: true }).click();
  await call('PUT', 'dashboard/attendance/settings', { enabled: false, mapsUrl: 'https://www.google.com/maps?q=24.7136,46.6753', radius: 300 });
  await page.goto('practitioner');
  await page.getByRole('button', { name: 'الحساب', exact: true }).click();
  await expect(page.getByRole('button', { name: 'التحضير', exact: true })).toHaveCount(0);
  expect((await call('GET', `dashboard/courses/${course.id}/attendance-sessions`)).find(row => row.id === session.id).isOpen).toBe(false);
  const reopened = await call('POST', `dashboard/courses/${course.id}/attendance-sessions`, { hours: 3 }, 201);
  await call('POST', 'dashboard/manual-attendance', { courseId: course.id, sessionId: reopened.id, presentStudents: [
    { loginId: 'attendance-student', studentId: student.id, studentName: student.name },
  ] }, 204);
  const result = await call('GET', 'dashboard/snapshot');
  expect(result.attendance.filter(row => row.courseId === course.id && row.loginId === 'attendance-student')
    .reduce((sum, row) => sum + row.hours, 0)).toBe(5.5);
  await page.goto('student');
  await page.locator('.student-course-filters-card .v-field').click();
  await page.getByRole('option', { name: course.title, exact: true }).click();
  await expect(page.locator('.student-course-section').first().getByText('حاضر', { exact: true })).toBeVisible();
  await expect(page.getByText(/ساعات الحضور:/)).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
