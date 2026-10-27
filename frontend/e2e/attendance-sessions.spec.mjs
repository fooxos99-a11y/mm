import { expect, test } from './support/isolatedTest.mjs';
import { login } from './support/gesture-helpers.mjs';
import { adminLogin, adminPassword, studentPassword } from './support/credentials.mjs';

test('attendance settings persist both switch states', async ({ page }, info) => {
  await login(page);
  const url = 'dashboard?panel=settings&settingsItem=attendance';
  await page.goto(url);
  const disabled = page.getByRole('button', { name: 'تفعيل التحضير الذاتي للطلاب: إيقاف', exact: true });
  await expect(disabled).toBeEnabled();
  await disabled.click();
  await page.getByLabel('موقع التحضير', { exact: true }).fill('https://www.google.com/maps?q=24.7136,46.6753');
  await page.getByLabel('نطاق التحضير (متر)', { exact: true }).fill('450');
  const save = async () => {
    const response = page.waitForResponse(row => row.url().endsWith('/dashboard/attendance/settings') && row.request().method() === 'PUT');
    await page.getByRole('button', { name: 'حفظ', exact: true }).click();
    expect((await response).status()).toBe(200);
  };
  await save();
  await page.goto(url);
  const enabled = page.getByRole('button', { name: 'تفعيل التحضير الذاتي للطلاب: تشغيل', exact: true });
  await expect(enabled).toBeEnabled();
  await expect(page.getByLabel('نطاق التحضير (متر)', { exact: true })).toHaveValue('450');
  await page.screenshot({ path: info.outputPath('attendance-settings-final.png') });
  await enabled.click();
  await save();
  await page.goto(url);
  await expect(disabled).toBeEnabled();
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
  const course = await call('POST', 'dashboard/courses', { title: 'دورة التحضير', isActive: false }, 201);
  const other = await call('POST', 'dashboard/courses', { title: 'الدورة الثانية', isActive: false }, 201);
  await call('PUT', `dashboard/courses/${course.id}/enrollments`, { branchCode: 'male', studentIds: [student.id] });
  await login(page);
  await page.goto('dashboard?panel=settings&settingsItem=attendance');
  await expect(page.getByRole('heading', { name: 'التحضير', exact: true })).toBeVisible();
  const toggle = page.getByRole('button', { name: 'تفعيل التحضير الذاتي للطلاب: إيقاف', exact: true });
  await expect(toggle).toBeEnabled();
  await toggle.click();
  await page.getByLabel('موقع التحضير', { exact: true }).fill('https://www.google.com/maps?q=24.7136,46.6753');
  await expect(page.getByLabel('نطاق التحضير (متر)', { exact: true })).toHaveValue('300');
  await page.getByRole('button', { name: 'حفظ', exact: true }).click();
  await expect.poll(async () => (await call('GET', 'dashboard/attendance/settings')).enabled).toBe(true);
  await page.screenshot({ path: info.outputPath('attendance-settings.png'), fullPage: false });

  await page.goto(`dashboard?panel=courses&courseId=${course.id}`);
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
  await expect(staffPage.locator('.assessment-attendance__row')).toHaveCount(1);
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
  await expect(toggleStudent).toBeDisabled();
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
