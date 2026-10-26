import { expect, test } from './support/isolatedTest.mjs';
import { adminLogin, adminPassword, studentPassword } from './support/credentials.mjs';

const login = async (page, code, password, target) => {
  await page.goto('login');
  await page.locator('[autocomplete="username"]').fill(code);
  await page.locator('[autocomplete="current-password"]').fill(password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(url => url.pathname.endsWith(target));
};

test('optional reciter phone saves, validates, displays and clears without changing login codes', async ({ page, request }, info) => {
  const api = `http://127.0.0.1:${process.env.E2E_BACKEND_PORT}/api`;
  const auth = await request.post(`${api}/auth/login`, { data: { login_code: adminLogin, password: adminPassword } });
  expect(auth.ok()).toBe(true);
  const headers = { Authorization: `Bearer ${(await auth.json()).token}` };
  const loginCode = '001234';
  const studentLogin = '001235';
  const createStudent = await request.post(`${api}/students`, { headers, data: {
    name: 'معلم تجربة الجوال', loginId: studentLogin, branchId: 'male',
    password: studentPassword, passwordConfirmation: studentPassword,
  } });
  expect(createStudent.status()).toBe(201);
  const studentId = (await createStudent.json()).id;

  await login(page, adminLogin, adminPassword, '/dashboard');
  await page.goto('dashboard?panel=users');
  await expect(page.locator('.people-directory-status')).toBeVisible();
  await page.locator('.dashboard-topbar').getByRole('button', { name: 'إضافة', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('#people-editor-phone')).toHaveCount(0);
  await dialog.locator('.app-select').first().click();
  await page.getByRole('option', { name: 'مقرئ', exact: true }).click();
  const phone = dialog.locator('#people-editor-phone');
  await expect(phone).toHaveAttribute('type', 'tel');
  await dialog.getByPlaceholder('اسم المقرئ', { exact: true }).fill('مقرئ تجربة الجوال');
  await dialog.getByPlaceholder('رقم الدخول', { exact: true }).fill(loginCode);
  await phone.fill('1234');
  await dialog.getByRole('button', { name: 'إضافة', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('أدخل رقم جوال صحيحًا');
  await phone.fill('0501234567');
  await page.screenshot({ path: info.outputPath('reciter-phone-form.png'), fullPage: true });
  const savedResponse = page.waitForResponse(response => response.url().endsWith('/api/reciters') && response.status() === 200);
  await dialog.getByRole('button', { name: 'إضافة', exact: true }).click();
  const reciter = await (await savedResponse).json();
  await expect(dialog).toBeHidden();
  expect(reciter.phone).toBe('0501234567');
  expect(reciter.loginCode).toBe(loginCode);
  const payload = { currentLoginCode: loginCode, name: reciter.name, loginCode, branchId: 'male', linkedStudentIds: [studentId] };
  expect((await request.post(`${api}/reciters`, { headers, data: payload })).ok()).toBe(true);

  await page.goto('about:blank');
  await page.context().clearCookies();
  await login(page, studentLogin, studentPassword, '/practitioner');
  await page.goto('student');
  const openParts = async () => {
    const menu = page.getByRole('button', { name: 'فتح القائمة', exact: true });
    if (info.project.use.viewport.width <= 1024) {
      await expect(menu).toBeVisible();
      await menu.click();
    }
    await page.getByRole('button', { name: 'الإقراء', exact: true }).click();
    await expect(page.locator('.student-parts-grid')).toBeVisible();
  };
  await expect(page.locator('.student-reciter-phone')).toHaveCount(0);
  await openParts();
  const row = page.locator('.student-reciter-phone');
  await expect(row).toHaveText('رقم جوال المقرئ: 0501234567');
  const link = row.getByRole('link');
  await expect(link).toHaveAttribute('href', 'tel:0501234567');
  await expect(link).toHaveAttribute('dir', 'ltr');
  expect((await link.boundingBox()).height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: info.outputPath('reciter-phone-student.png'), fullPage: true });

  const cleared = await request.post(`${api}/reciters`, { headers, data: { ...payload, phone: '' } });
  expect(cleared.ok()).toBe(true);
  expect((await cleared.json()).loginCode).toBe(loginCode);
  await page.reload();
  await expect(page.locator('.student-page .dashboard-loader-shell')).toHaveCount(0);
  await openParts();
  await expect(row).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('reciter-without-phone.png'), fullPage: true });
});
