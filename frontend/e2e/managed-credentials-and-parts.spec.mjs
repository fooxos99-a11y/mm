import { expect, test } from './support/isolatedTest.mjs';
import { adminLogin, adminPassword } from './support/credentials.mjs';

test.setTimeout(240_000);

const signIn = async (page, code, password, target) => {
  await page.goto('login');
  await page.locator('[autocomplete="username"]').fill(code);
  await page.locator('[autocomplete="current-password"]').fill(password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(url => url.pathname.endsWith(target));
};
const signOut = async (page, api) => {
  const csrf = (await page.context().cookies(api)).find(cookie => cookie.name === 'XSRF-TOKEN');
  const response = await page.request.post(`${api}/auth/logout`, { headers: {
    Referer: page.url(), 'X-XSRF-TOKEN': decodeURIComponent(csrf.value), Accept: 'application/json',
  } });
  expect(response.status()).toBe(204);
  await page.goto('login');
  await expect(page.locator('[autocomplete="username"]')).toBeVisible();
};
const setup = async (request, branch = 'male') => {
  const api = `http://127.0.0.1:${process.env.E2E_BACKEND_PORT}/api`;
  const auth = await request.post(`${api}/auth/login`, { data: { login_code: adminLogin, password: adminPassword } });
  expect(auth.ok()).toBe(true);
  const headers = { Authorization: `Bearer ${(await auth.json()).token}` };
  const studentResponse = await request.post(`${api}/students`, { headers, data: {
    name: 'معلم فحص التحديد', loginId: '00708', branchId: branch,
    password: '01234567', passwordConfirmation: '01234567',
  } });
  expect(studentResponse.status()).toBe(201);
  const student = await studentResponse.json();
  const reciterResponse = await request.post(`${api}/reciters`, { headers, data: {
    name: 'مقرئ فحص التحديد', loginCode: '00709', branchId: branch, linkedStudentIds: [student.id],
    password: '87654321', passwordConfirmation: '87654321',
  } });
  expect(reciterResponse.ok()).toBe(true);
  return { api, headers, student, reciter: await reciterResponse.json() };
};

for (const branch of ['male', 'female']) {
  test(`select all persists every ${branch} part through administration and reciter access`, async ({ page, request }, info) => {
    const { api, headers, student, reciter } = await setup(request, branch);
    const count = branch === 'female' ? 10 : 30;
    await signIn(page, adminLogin, adminPassword, '/dashboard');
    await page.goto('dashboard?panel=users');
    if (branch === 'female') {
      await page.locator('.app-select').filter({ has: page.locator('#people-branch-filter') }).click();
      await page.getByRole('option', { name: 'معلمات', exact: true }).click();
    }
    await page.getByRole('searchbox', { name: 'البحث بالاسم أو رقم الدخول' }).fill('00708');
    await expect(page.locator('.people-card')).toHaveCount(1);
    await page.locator('.people-card .people-metric--clickable').click();
    const dialog = page.getByRole('dialog');
    const all = dialog.getByRole('button', { name: 'تحديد الكل', exact: true });
    await expect(dialog.locator('.people-parts-dialog__circle')).toHaveCount(count);
    expect((await all.boundingBox()).height).toBeGreaterThanOrEqual(44);
    await page.route(`**/students/${student.id}/parts`, route => route.fulfill({ status: 503, json: { message: 'تعذر الحفظ مؤقتًا' } }));
    await all.click();
    await expect(dialog.locator('[aria-pressed="true"]')).toHaveCount(0);
    await expect(all).toBeEnabled();
    await page.unroute(`**/students/${student.id}/parts`);
    await all.click();
    await expect(dialog.locator('[aria-pressed="true"]')).toHaveCount(count);
    await expect(all).toBeDisabled();
    await expect(dialog.locator('.people-parts-dialog__circle').first()).toBeEnabled();
    await page.screenshot({ path: info.outputPath(`admin-select-all-${branch}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await page.locator('.people-card .people-metric--clickable').click();
    await expect(dialog.locator('[aria-pressed="true"]')).toHaveCount(count);
    await page.keyboard.press('Escape');
    // Leave one missing part to exercise the same action as the assigned reciter.
    expect((await request.put(`${api}/students/${student.id}/parts/1`, { headers,
      data: { reciterId: reciter.id, shouldMarkComplete: false } })).status()).toBe(204);
    await signOut(page, api);
    await signIn(page, '00709', '87654321', '/reciter');
    const card = page.locator('.reciter-student-card');
    await expect(card.locator('.reciter-part-circle--active')).toHaveCount(count - 1);
    const saved = page.waitForResponse(response => response.url().endsWith(`/students/${student.id}/parts`)
      && response.request().method() === 'PUT');
    await card.getByRole('button', { name: 'تحديد الكل', exact: true }).click();
    expect((await saved).status()).toBe(200);
    await expect(card.locator('.reciter-part-circle--active')).toHaveCount(count);
    await expect(card.locator('.reciter-part-circle').first()).toBeEnabled();
    await expect(card.getByRole('button', { name: 'تحديد الكل', exact: true })).toBeDisabled();
    await page.reload();
    await expect(card.locator('.reciter-part-circle--active')).toHaveCount(count);
    await page.screenshot({ path: info.outputPath(`reciter-select-all-${branch}.png`), fullPage: true });
  });
}

test('administrator sees current credentials and learners cannot change them after repeated sign ins', async ({ page, request }, info) => {
  const { api } = await setup(request);
  await signIn(page, adminLogin, adminPassword, '/dashboard');
  await page.goto('dashboard?panel=users');
  const search = page.getByRole('searchbox', { name: 'البحث بالاسم أو رقم الدخول' });
  await search.fill('00708');
  await page.getByRole('button', { name: 'تعديل المعلم', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const current = dialog.getByLabel('كلمة المرور الحالية', { exact: true });
  await expect(current).toHaveValue('01234567');
  await expect(current).toHaveAttribute('readonly', '');
  await expect(current).toHaveAttribute('type', 'password');
  await dialog.locator('.app-password-field').first().getByRole('button', { name: 'إظهار كلمة المرور', exact: true }).click();
  await expect(current).toHaveAttribute('type', 'text');
  await expect(dialog.getByLabel('كلمة المرور الجديدة (اختياري)', { exact: true })).toHaveValue('');
  await dialog.getByLabel('كلمة المرور الجديدة (اختياري)', { exact: true }).fill('00112233');
  await dialog.getByLabel('تأكيد كلمة المرور', { exact: true }).fill('00112233');
  await dialog.getByRole('button', { name: 'تحديث', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'تعديل المعلم', exact: true }).click();
  await expect(current).toHaveValue('00112233');
  await page.screenshot({ path: info.outputPath('managed-current-password.png') });
  await dialog.getByRole('button', { name: 'إلغاء', exact: true }).click();
  await search.fill('');
  await page.locator('.app-select').filter({ has: page.locator('#people-branch-filter') }).click();
  await page.getByRole('option', { name: 'مقرئين', exact: true }).click();
  await search.fill('00709');
  await page.getByRole('button', { name: 'تعديل المقرئ', exact: true }).click();
  await expect(current).toHaveValue('87654321');
  await dialog.getByRole('button', { name: 'إلغاء', exact: true }).click();
  await signOut(page, api);
  for (let cycle = 0; cycle < 2; cycle++) {
    await signIn(page, '00708', '00112233', '/practitioner');
    await page.goto('change-password');
    await expect(page).toHaveURL(/\/student$/);
    await expect(page.locator('.change-password-panel')).toHaveCount(0);
    const csrf = (await page.context().cookies(api)).find(cookie => cookie.name === 'XSRF-TOKEN');
    const denied = await page.request.put(`${api}/auth/password`, { headers: {
      Referer: page.url(), 'X-XSRF-TOKEN': decodeURIComponent(csrf.value), Accept: 'application/json',
    }, data: { currentPassword: '00112233', password: '12345678', passwordConfirmation: '12345678' } });
    expect(denied.status()).toBe(403);
    await signOut(page, api);
  }
});

test('supervisory account editor displays the saved current password separately from a new password', async ({ page, request }, info) => {
  const { api, headers } = await setup(request);
  const created = await request.post(`${api}/dashboard/accounts`, { headers, data: {
    name: 'مشرف تجربة الرمز', loginCode: '00710', role: 'male_manager', password: '01234567',
  } });
  expect(created.status()).toBe(201);
  await signIn(page, adminLogin, adminPassword, '/dashboard');
  await page.goto('dashboard?panel=settings&settingsItem=permissions');
  await expect(page.getByRole('heading', { name: 'الإشراف', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'تعديل حساب مشرف تجربة الرمز', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'تعديل الحساب الإشرافي', exact: true });
  await expect(dialog.getByLabel('كلمة المرور الحالية', { exact: true })).toHaveValue('01234567');
  await expect(dialog.locator('#dashboard-account-password')).toHaveValue('');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: info.outputPath('supervisory-current-password.png') });
  await dialog.getByRole('button', { name: 'إلغاء', exact: true }).click();
  await expect(dialog).toHaveCount(0);
});
