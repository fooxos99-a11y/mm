import { expect, test } from './support/isolatedTest.mjs';
import { createAssessmentAttempt, completeAttempt } from './support/assessmentAttemptFixture.mjs';
import { login } from './support/gesture-helpers.mjs';
import { studentPassword } from './support/credentials.mjs';

for (const type of ['pre', 'post', 'tasks']) {
  test(`${type} resets a submitted answer and opens the same assessment with empty answers`, async ({ page, context }, info) => {
    const { origin, course, loginId, questions } = await createAssessmentAttempt(page, context, type, String(info.project.use.viewport.width));
    await completeAttempt(page, questions);
    const saved = page.waitForResponse(response => response.url().endsWith('/public/assessment-submissions') && response.status() === 201);
    await page.locator('.assessment-submit-row').getByRole('button', { name: 'إرسال', exact: true }).click();
    const submissionId = (await (await saved).json()).id;
    await expect(page.locator('.assessment-state--success')).toBeVisible();
    await page.goto('about:blank');
    await context.clearCookies();
    await login(page);
    const token = (await context.cookies(origin)).find(cookie => cookie.name === 'XSRF-TOKEN');
    const closed = await page.request.put(`${origin}/api/dashboard/courses/${course.id}`, {
      headers: { Referer: page.url(), 'X-XSRF-TOKEN': decodeURIComponent(token.value) },
      data: { isPreEnabled: false, isPostEnabled: false, isTasksEnabled: false },
    });
    expect(closed.ok()).toBeTruthy();
    await page.goto('dashboard?panel=results');
    await page.getByRole('combobox', { name: 'القسم', exact: true }).locator('..').click();
    await page.getByRole('option', { name: course.title, exact: true }).click();
    if (type !== 'tasks') {
      await page.getByRole('combobox', { name: 'نوع البيانات', exact: true }).locator('..').click();
      await page.getByRole('option', { name: type === 'pre' ? 'الاختبار القبلي' : 'الاختبار البعدي', exact: true }).click();
    }
    await page.locator('.results-entry').filter({ hasText: loginId }).getByRole('button', { name: /عرض إجابة/ }).click();
    await page.getByRole('button', { name: 'إتاحة محاولة جديدة', exact: true }).click();
    const confirmation = page.getByRole('dialog', { name: 'إعادة المحاولة', exact: true });
    await expect(confirmation).toContainText('ستُحذف');
    expect(await confirmation.locator('input,textarea').count()).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath(`${type}-retry-confirmation.png`), fullPage: true });
    const reset = page.waitForResponse(response => response.url().endsWith(`/assessment-submissions/${submissionId}/reset`));
    await confirmation.getByRole('button', { name: 'إعادة المحاولة', exact: true }).click();
    expect((await reset).status()).toBe(204);
    await expect(confirmation).not.toBeVisible();
    await page.goto('about:blank');
    await context.clearCookies();
    await login(page, loginId, studentPassword);
    await page.goto(type === 'tasks' ? `tasks?taskId=${course.id}` : `course/${type}`);
    for (const question of questions) {
      const card = page.locator('.assessment-question').filter({ hasText: question.prompt });
      await expect(card).toBeVisible();
      await expect(card.locator('button[aria-pressed=true]')).toHaveCount(0);
      if (question.type === 'text') {
        await expect(card.locator('textarea')).toHaveValue('');
        await expect(card.locator('input[type=file]')).toHaveValue('');
      }
    }
    await expect(page.getByText('متاحة لك محاولة جديدة', { exact: false })).toHaveCount(0);
    await expect(page.locator('.assessment-submit-row').getByRole('button', { name: 'إرسال', exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath(`${type}-empty-retry.png`), fullPage: true });
    await completeAttempt(page, questions);
    const resubmitted = page.waitForResponse(response => response.url().endsWith('/public/assessment-submissions') && response.status() === 201);
    await page.locator('.assessment-submit-row').getByRole('button', { name: 'إرسال', exact: true }).click();
    expect((await (await resubmitted).json()).id).not.toBe(submissionId);
    await expect(page.locator('.assessment-state--success')).toBeVisible();
  });
}

test('document retry restores the original Word template and resource without the old answer', async ({ page, context }, info) => {
  await login(page);
  const origin = new URL(process.env.VUE_APP_API_BASE_URL).origin;
  const token = (await context.cookies(origin)).find(cookie => cookie.name === 'XSRF-TOKEN');
  const api = async (method, route, data) => {
    const response = await page.request.fetch(`${origin}/api${route}`, {
      method, data, headers: { Referer: page.url(), 'X-XSRF-TOKEN': decodeURIComponent(token.value) },
    });
    expect(response.ok(), `${route}: ${response.status()}`).toBeTruthy();
    return response.status() === 204 ? null : response.json();
  };
  const loginId = `983${String(info.project.use.viewport.width).padStart(7, '0')}`;
  await api('POST', '/students', { name: 'طالب إعادة الوورد', loginId, branchId: 'male',
    password: studentPassword, passwordConfirmation: studentPassword });
  const task = await api('POST', '/dashboard/courses', { title: 'إعادة مهمة الوورد', entityType: 'task',
    taskMode: 'document', taskTemplateContent: '<p>قالب المهمة الأصلي</p>', youtubeUrl: 'https://example.com/original-task' });
  await api('PUT', `/dashboard/courses/${task.id}`, { isTasksEnabled: true });
  const snapshot = await api('GET', '/dashboard/snapshot');
  const questionId = snapshot.courses.find(course => course.id === task.id).taskQuestions[0].id;
  const saved = await api('POST', '/dashboard/assessment-submissions', { courseId: task.id, assessmentType: 'tasks',
    loginId, studentName: 'طالب إعادة الوورد', answers: [{ questionId, value: '<p>إجابة قديمة يجب حذفها</p>' }] });
  await api('PUT', `/dashboard/courses/${task.id}`, { isTasksEnabled: false });
  await api('POST', `/dashboard/assessment-submissions/${saved.id}/reset`);
  await page.goto('about:blank');
  await context.clearCookies();
  await login(page, loginId, studentPassword);
  await page.goto(`tasks?taskId=${task.id}`);
  await expect(page.locator('.ql-editor')).toContainText('قالب المهمة الأصلي');
  await expect(page.locator('.ql-editor')).not.toContainText('إجابة قديمة');
  await expect(page.locator('a[href="https://example.com/original-task"]')).toBeVisible();
  await expect(page.locator('.assessment-submit-row').getByRole('button', { name: 'إرسال', exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('document-empty-retry.png'), fullPage: true });
});
