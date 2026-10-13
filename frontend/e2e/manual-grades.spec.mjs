import { selectOption } from './support/gesture-helpers.mjs';
import { expect, test } from './support/isolatedTest.mjs';

test('manual grades save all drafts across search, recover from failure, and support pre and post without questions', async ({ page, request }, info) => {
  const api = `http://127.0.0.1:${process.env.E2E_BACKEND_PORT}/api`;
  const auth = await request.post(`${api}/auth/login`, { data: { login_code: process.env.E2E_ADMIN_LOGIN, password: process.env.E2E_ADMIN_PASSWORD } });
  const headers = { Accept: 'application/json', Authorization: `Bearer ${(await auth.json()).token}` };
  const prefix = `Grades${info.project.name.replace(/[^a-z0-9]/gi, '')}`;
  const created = await request.post(`${api}/dashboard/courses`, { headers,
    data: { title: prefix, entityType: 'course', isActive: true } });
  expect(created.status()).toBe(201);
  const course = await created.json();
  const students = [];
  for (let i = 0; i < 21; i++) {
    const response = await request.post(`${api}/students`, { headers, data: {
      name: `${prefix} ${String(i).padStart(2, '0')}`, loginId: `${prefix}${i}`, branchId: 'male',
    } });
    expect(response.status()).toBe(201);
    students.push(await response.json());
  }
  const read = async (type) => (await request.get(`${api}/dashboard/results`, { headers,
    params: { courseId: course.id, assessmentType: type, branchCode: 'male', perPage: 100 } })).json();
  const rosterSize = (await read('pre')).pagination.total;
  await Promise.all([page.waitForResponse(response => response.url().endsWith('/auth/session')), page.goto('login')]);
  await page.locator('input[autocomplete="username"]').fill(process.env.E2E_ADMIN_LOGIN);
  await page.locator('input[autocomplete="current-password"]').fill(process.env.E2E_ADMIN_PASSWORD);
  await Promise.all([page.waitForResponse(response => response.url().endsWith('/dashboard/shell')), page.locator('form button[type="submit"]').click()]);
  await page.goto('dashboard?panel=results');
  await page.getByRole('combobox', { name: 'القسم', exact: true }).locator('..').click();
  await selectOption(page, prefix, { exact: true });
  const selectType = async (label) => {
    await page.getByRole('combobox', { name: 'نوع البيانات', exact: true }).locator('..').click();
    await selectOption(page, label, { exact: true });
  };
  await selectType('الاختبار القبلي');
  await page.getByRole('button', { name: 'إدخال الدرجات', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'درجات الاختبار القبلي', exact: true });
  await expect(dialog.locator('.grade-dialog__row')).toHaveCount(rosterSize);
  await dialog.getByLabel('الدرجة الكاملة', { exact: true }).fill('15');
  const firstInput = dialog.getByRole('spinbutton', { name: `درجة ${students[0].name}`, exact: true });
  const lastInput = dialog.getByRole('spinbutton', { name: `درجة ${students[20].name}`, exact: true });
  await firstInput.fill('0');
  await lastInput.fill('16');
  const rangeError = dialog.getByText('يجب أن تساوي درجة الاختبار درجة الطالب أو تزيد عليها.', { exact: true });
  await expect(dialog.locator('.grade-dialog__hint')).toHaveCount(0);
  await expect(rangeError).toHaveCount(0);
  await dialog.getByRole('button', { name: 'حفظ الدرجات', exact: true }).click();
  await expect(lastInput).toHaveAttribute('aria-invalid', 'true');
  await expect(rangeError).toBeVisible();
  await lastInput.fill('13.5');
  await expect(rangeError).toHaveCount(0);
  await dialog.getByRole('searchbox', { name: 'البحث عن طالب', exact: true }).fill(students[20].name);
  await expect(dialog.locator('.grade-dialog__row')).toHaveCount(1);
  await expect(dialog.locator('output')).toContainText('عدد التعديلات: 2');
  await page.route('**/api/dashboard/results/grades', route => route.fulfill({ status: 503,
    contentType: 'application/json', body: JSON.stringify({ message: 'تعذّر الحفظ مؤقتًا.' }) }));
  await dialog.getByRole('button', { name: 'حفظ الدرجات', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('تعذّر الحفظ مؤقتًا.');
  await expect(lastInput).toHaveValue('13.5');
  await page.unroute('**/api/dashboard/results/grades');
  await dialog.getByRole('searchbox', { name: 'البحث عن طالب', exact: true }).fill('');
  await expect(firstInput).toHaveValue('0');
  await dialog.locator('.grade-dialog__body').evaluate(element => { element.scrollTop = 0; });
  await page.screenshot({ path: info.outputPath('manual-grades.png') });
  expect(await dialog.evaluate(element => element.scrollWidth > element.clientWidth + 1)).toBe(false);
  expect(await dialog.locator('.grade-dialog__body').evaluate(element => element.scrollWidth > element.clientWidth + 1)).toBe(false);
  for (const field of [firstInput, dialog.getByLabel('الدرجة الكاملة', { exact: true })]) {
    expect(await field.evaluate(element => {
      const input = element.getBoundingClientRect();
      const control = element.closest('.app-field__control').getBoundingClientRect();
      return input.left >= control.left && input.right <= control.right + 1;
    })).toBe(true);
  }
  const saveButton = dialog.getByRole('button', { name: 'حفظ الدرجات', exact: true });
  const box = await saveButton.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize().height);
  await Promise.all([page.waitForResponse(response => response.url().endsWith('/results/grades') && response.status() === 200), saveButton.click()]);
  await expect(dialog).not.toBeVisible();
  const pre = await read('pre');
  expect(pre.submissions).toHaveLength(2);
  expect(pre.submissions.find(row => row.loginId === students[0].loginId).manualScore).toBe(0);
  expect(pre.submissions.find(row => row.loginId === students[20].loginId).manualScore).toBe(13.5);
  expect(pre.submissions.every(row => row.scoreOnly && row.answers.length === 0)).toBe(true);
  await page.getByRole('button', { name: 'إدخال الدرجات', exact: true }).click();
  await expect(dialog.getByLabel('الدرجة الكاملة', { exact: true })).toBeDisabled();
  await expect(firstInput).toHaveValue('0');
  await firstInput.fill('12');
  const lastRow = dialog.locator(`[data-student-id="${students[20].id}"]`);
  await lastRow.getByRole('button', { name: 'إلغاء الدرجة اليدوية', exact: true }).click();
  await expect(lastInput).toBeDisabled();
  const concurrent = await request.put(`${api}/dashboard/results/grades`, { headers, data: {
    courseId: course.id, assessmentType: 'pre', branchCode: 'male', totalPoints: 15,
    grades: [{ studentId: students[0].id, score: 10,
      expectedVersion: pre.scoreEntries.find(row => row.studentId === students[0].id).version }],
  } });
  expect(concurrent.status()).toBe(200);
  await dialog.getByRole('button', { name: 'حفظ الدرجات', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('تغيّرت بعض الدرجات');
  await expect(firstInput).toHaveValue('12');
  await dialog.getByRole('button', { name: 'تحديث الدرجات الحالية', exact: true }).click();
  await expect(dialog.locator(`[data-student-id="${students[0].id}"]`)).toContainText('المحفوظة: 10 / 15');
  await expect(firstInput).toHaveValue('12');
  await expect(lastInput).toBeDisabled();
  await dialog.getByRole('button', { name: 'حفظ الدرجات', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const edited = await read('pre');
  expect(edited.submissions).toHaveLength(1);
  expect(edited.submissions[0].manualScore).toBe(12);
  await selectType('الاختبار البعدي');
  await page.getByRole('button', { name: 'إدخال الدرجات', exact: true }).click();
  const postDialog = page.getByRole('dialog', { name: 'درجات الاختبار البعدي', exact: true });
  await expect(postDialog.locator('.grade-dialog__row')).toHaveCount(rosterSize);
  await postDialog.getByLabel('الدرجة الكاملة', { exact: true }).fill('20');
  await postDialog.getByRole('spinbutton', { name: `درجة ${students[0].name}`, exact: true }).fill('17');
  await postDialog.locator('.app-dialog-footer').getByRole('button', { name: 'إغلاق', exact: true }).click();
  await page.getByRole('dialog', { name: 'إغلاق دون حفظ؟', exact: true }).getByRole('button', { name: 'متابعة التعديل', exact: true }).click();
  await expect(postDialog.getByRole('spinbutton', { name: `درجة ${students[0].name}`, exact: true })).toHaveValue('17');
  await postDialog.getByRole('button', { name: 'حفظ الدرجات', exact: true }).click();
  await expect(postDialog).not.toBeVisible();
  expect((await read('post')).submissions[0].manualScore).toBe(17);
  expect((await read('pre')).submissions[0].manualScore).toBe(12);
  await selectType('التحضير');
  await expect(page.getByRole('button', { name: 'إدخال الدرجات', exact: true })).toHaveCount(0);
});
