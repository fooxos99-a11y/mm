import { expect, test } from './support/isolatedTest.mjs';
import AxeBuilder from '@axe-core/playwright';
import { login } from './support/gesture-helpers.mjs';
import { studentPassword } from './support/credentials.mjs';

test.use({ actionTimeout: 20_000 });

test('document template and both student answers survive real typing, failed save, submission and reload', async ({ page, context }, info) => {
  test.setTimeout(240_000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await login(page);
  const origin = new URL(process.env.VUE_APP_API_BASE_URL).origin;
  const request = async (method, route, data) => {
    const cookie = (await context.cookies(origin)).find(item => item.name === 'XSRF-TOKEN');
    return page.request.fetch(`${origin}/api${route}`, { method, data,
      headers: { Accept: 'application/json', Referer: page.url(), 'X-XSRF-TOKEN': decodeURIComponent(cookie?.value || '') } });
  };
  const api = async (method, route, data) => {
    const response = await request(method, route, data);
    expect(response.ok(), `${route}: ${response.status()}`).toBeTruthy();
    return response.status() === 204 ? null : response.json();
  };
  const suffix = info.project.name.replace(/\D/g, '');
  const title = `حفظ وورد ${suffix}`;
  const task = await api('POST', '/dashboard/courses', { title, entityType: 'task',
    taskMode: 'document', taskPoints: 10, isActive: false });
  const students = ['male', 'female'].map((branchId, index) => ({
    branchId, loginId: `85${index}${suffix.padStart(7, '0')}`, name: `طالب وورد ${branchId}`,
  }));
  for (const student of students) {
    await api('POST', '/students', { ...student, password: studentPassword, passwordConfirmation: studentPassword });
  }
  const selectTask = async () => {
    await page.goto('dashboard?panel=tasks');
    await page.locator('.assessment-select:visible').first().locator('.v-field').click();
    await page.getByText(title, { exact: true }).click();
    await expect(page.locator('.ql-editor')).toBeVisible();
  };
  await selectTask();
  const editor = page.locator('.ql-editor');
  const templateText = 'قالب وورد محفوظ';
  await editor.click();
  await editor.pressSequentially(templateText);
  await expect(editor).toHaveText(templateText);
  await editor.press('Control+A');
  await page.getByRole('button', { name: 'عريض', exact: true }).click();
  await expect(editor.locator('strong')).toContainText(templateText);
  const syncPath = `/api/dashboard/courses/${task.id}/questions/sync`;
  await page.route(`**${syncPath}`, route => route.fulfill({ status: 500, contentType: 'application/json',
    body: JSON.stringify({ message: 'تعذر الحفظ في تجربة الانقطاع' }) }), { times: 1 });
  const failedSave = page.waitForResponse(response => response.url().endsWith(syncPath), { timeout: 20_000 });
  await page.getByRole('button', { name: 'حفظ', exact: true }).click();
  expect((await failedSave).status()).toBe(500);
  await expect(page.getByText('تعذر الحفظ في تجربة الانقطاع', { exact: true })).toBeVisible();
  await expect(editor).toContainText(templateText);
  const saved = page.waitForResponse(response => response.url().endsWith(syncPath), { timeout: 20_000 });
  await page.getByRole('button', { name: 'حفظ', exact: true }).click();
  const response = await saved;
  expect(response.status()).toBe(200);
  expect(typeof response.request().postDataJSON().courseUpdates.taskTemplateContent).toBe('string');
  const savedTask = (await api('GET', '/dashboard/snapshot')).courses.find(item => item.id === task.id);
  expect(savedTask.taskTemplateContent).toContain(`<strong>${templateText}</strong>`);
  expect(savedTask.taskTemplateContent).not.toContain('[object');
  await selectTask();
  await expect(editor.locator('strong')).toHaveText(templateText);

  await api('PUT', `/dashboard/courses/${task.id}`, { isTasksEnabled: true });

  for (const student of students) {
    await page.goto('about:blank');
    await context.clearCookies();
    await login(page, student.loginId, studentPassword);
    const forbidden = await request('PUT', `/dashboard/courses/${task.id}`, { taskTemplateContent: 'تغيير غير مصرح' });
    expect(forbidden.status()).toBe(403);
    await page.goto(`tasks?taskId=${task.id}`);
    await expect(editor).toContainText(templateText);
    await editor.click();
    await editor.press('Control+End');
    await editor.press('Enter');
    const answerText = `إجابة الطالب ${student.branchId} محفوظة`;
    await editor.pressSequentially(answerText);
    await expect(editor).toContainText(answerText);
    const sent = page.waitForResponse(result => result.url().endsWith('/api/public/assessment-submissions')
      && result.request().method() === 'POST');
    await page.getByRole('button', { name: 'إرسال', exact: true }).click();
    const submissionResponse = await sent;
    expect(submissionResponse.status()).toBe(201);
    const sentRequest = submissionResponse.request();
    const form = await new Response(sentRequest.postDataBuffer(), {
      headers: { 'Content-Type': sentRequest.headers()['content-type'] },
    }).formData();
    const value = form.get('answers[0][value]');
    expect(typeof value).toBe('string');
    expect(value).toContain(answerText);
    expect(value).not.toContain('[object');
    await expect(page.getByText('تم الإرسال', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText('تم الإرسال', { exact: true })).toBeVisible();
    const ownSubmission = (await api('GET', '/public/snapshot')).submissions.find(item => item.courseId === task.id);
    expect(ownSubmission.answers[0].value).toContain(answerText);
  }
  await page.goto('about:blank');
  await context.clearCookies();
  await login(page);
  const snapshot = await api('GET', '/dashboard/snapshot');
  const submissions = snapshot.submissions.filter(item => item.courseId === task.id);
  expect(submissions).toHaveLength(2);
  for (const student of students) {
    const answer = submissions.find(item => item.loginId === student.loginId).answers[0].value;
    expect(answer).toContain(`إجابة الطالب ${student.branchId} محفوظة`);
    expect(answer).toContain(templateText);
    expect(answer).not.toContain('[object');
  }
  expect(errors).toEqual([]);
});

test('document toolbar exposes Arabic names for formatting and font choices', async ({ page, context }) => {
  await login(page);
  const origin = new URL(process.env.VUE_APP_API_BASE_URL).origin;
  const cookie = (await context.cookies(origin)).find(item => item.name === 'XSRF-TOKEN');
  const response = await page.request.post(`${origin}/api/dashboard/courses`, {
    headers: { Accept: 'application/json', Referer: page.url(), 'X-XSRF-TOKEN': decodeURIComponent(cookie.value) },
    data: { title: 'أدوات محرر وورد', entityType: 'task', taskMode: 'document', isActive: false },
  });
  expect(response.status()).toBe(201);
  await page.goto('dashboard?panel=tasks');
  await page.locator('.assessment-select:visible').first().locator('.v-field').click();
  await page.getByText('أدوات محرر وورد', { exact: true }).click();
  await expect(page.locator('.ql-editor')).toBeVisible();
  expect((await new AxeBuilder({ page }).include('.rich-text-editor').analyze()).violations).toEqual([]);
  const toolbar = page.locator('.rich-text-editor__toolbar');
  await toolbar.getByRole('button', { name: 'اختيار الخط', exact: true }).click();
  await expect(toolbar.getByRole('button', { name: 'العربي التقليدي', exact: true })).toBeVisible();
  await toolbar.getByRole('button', { name: 'العربي التقليدي', exact: true }).click();
  expect((await new AxeBuilder({ page }).include('.rich-text-editor').analyze()).violations).toEqual([]);
});
