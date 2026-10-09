import { expect, test } from '@playwright/test';
import { login } from './support/gesture-helpers.mjs';

test.use({ screenshot: 'off' });

const apiSession = async (page, context) => {
  const origin = new URL(process.env.VUE_APP_API_BASE_URL).origin;
  const token = (await context.cookies(origin)).find((cookie) => cookie.name === 'XSRF-TOKEN');
  const headers = { Referer: page.url(), 'X-XSRF-TOKEN': decodeURIComponent(token.value) };
  return async (method, route, data) => {
    const response = await page.request.fetch(`${origin}/api/dashboard/${route}`, { method, headers, data });
    expect(response.ok(), await response.text()).toBeTruthy();
    return response.status() === 204 ? null : response.json();
  };
};
const questionValues = page => page.locator('.assessment-inline-list__item input[placeholder="اكتب السؤال"]')
  .evaluateAll(inputs => inputs.map(input => input.value));
const deleteCard = async (page, prompt) => {
  const cards = page.locator('.assessment-inline-list__item');
  await expect.poll(() => questionValues(page)).toContain(prompt);
  for (let index = 0; index < await cards.count(); index += 1) {
    const card = cards.nth(index);
    if (await card.locator('input[placeholder="اكتب السؤال"]').inputValue() === prompt) {
      await card.getByRole('button', { name: /حذف السؤال/ }).click();
      break;
    }
  }
  await expect.poll(() => questionValues(page)).not.toContain(prompt);
};

for (const type of ['pre', 'post', 'tasks']) {
  test(`delete every ${type} question through the UI while keeping previous answers`, async ({ page, context }, info) => {
    await login(page);
    const api = await apiSession(page, context);
    const title = `حذف ${type} ${info.project.name}`;
    const course = await api('POST', 'courses', { title, entityType: type === 'tasks' ? 'task' : 'course', isActive: false });
    const ids = [];
    for (const prompt of ['السؤال المحذوف', 'السؤال المتبقي']) {
      const question = await api('POST', `courses/${course.id}/questions`, {
        assessmentType: type, prompt, type: 'text', options: [], allowFile: false, points: 3, correctAnswer: '',
      });
      ids.push(question.id);
    }
    await api('PUT', `courses/${course.id}`, { isTasksEnabled: true });
    const submission = await api('POST', 'assessment-submissions', {
      courseId: course.id, assessmentType: type, studentName: 'سجل الحذف',
      loginId: `delete-${type}-${info.project.name}`, answers: [{ questionId: ids[0], value: 'إجابة محفوظة' }],
    });
    await page.goto(type === 'tasks' ? 'dashboard?panel=tasks' : `dashboard?panel=courses&courseId=${course.id}&assessmentType=${type}`);
    if (type === 'tasks') {
      await page.locator('.assessment-select:visible').first().locator('.v-field').click();
      await page.getByText(title, { exact: true }).click();
    } else {
      await page.locator('.assessment-select:visible').last().locator('.v-field').click();
      await page.getByRole('option').filter({ hasText: type === 'pre' ? 'الاختبار القبلي' : 'الاختبار البعدي' }).click();
    }
    await deleteCard(page, 'السؤال المحذوف');
    const firstSave = page.waitForResponse(response => response.url().endsWith(`/courses/${course.id}/questions/sync`));
    await page.getByRole('button', { name: 'حفظ', exact: true }).click();
    expect((await firstSave).status()).toBe(200);
    await expect.poll(() => questionValues(page)).toEqual(['السؤال المتبقي']);
    await deleteCard(page, 'السؤال المتبقي');
    const secondSave = page.waitForResponse(response => response.url().endsWith(`/courses/${course.id}/questions/sync`));
    await page.getByRole('button', { name: 'حفظ', exact: true }).click();
    expect((await secondSave).status()).toBe(200);
    await page.reload();
    const snapshot = await api('GET', 'snapshot');
    const saved = snapshot.courses.find(item => item.id === course.id);
    expect(saved[{ pre: 'preQuestions', post: 'postQuestions', tasks: 'taskQuestions' }[type]]).toEqual([]);
    expect(snapshot.submissions.find(item => item.id === submission.id).answers[0].value).toBe('إجابة محفوظة');
    const width = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
    expect(width.content).toBeLessThanOrEqual(width.viewport + 1);
  });
}

test('final exam supports successive delete-only saves without forcing a new question', async ({ page, context }, info) => {
  await login(page);
  const api = await apiSession(page, context);
  const questions = [];
  for (const suffix of ['أول', 'ثان']) {
    const prompt = `حذف نهائي ${suffix} ${info.project.name}`;
    const question = await api('POST', 'final-exam/questions', {
      branchCode: 'female', prompt, type: 'text', options: [], allowFile: false, points: 2, correctAnswer: '',
    });
    questions.push({ id: question.id, prompt });
  }
  await page.goto('dashboard?panel=finalexam');
  for (const question of questions) {
    await deleteCard(page, question.prompt);
    const deleted = page.waitForResponse(response => response.url().endsWith(`/final-exam/questions/${question.id}`)
      && response.request().method() === 'DELETE');
    await page.getByRole('button', { name: 'حفظ', exact: true }).click();
    expect((await deleted).status()).toBe(204);
    await expect(page.locator('.assessment-inline-builder input[placeholder="اكتب السؤال"]')).toHaveCount(0);
  }
  const snapshot = await api('GET', 'snapshot');
  expect(snapshot.finalExamQuestions.filter(item => questions.some(question => question.id === item.id))).toEqual([]);
});

test('deleting a global satisfaction indicator keeps answers and stops future inheritance', async ({ page, context }, info) => {
  await login(page);
  const api = await apiSession(page, context);
  const title = `استبيان الحذف ${info.project.name}`;
  const course = await api('POST', 'courses', { title, isActive: false });
  const prompt = `سؤال عام للحذف ${info.project.name}`;
  const copies = await api('POST', 'satisfaction-questions', { prompt, type: 'rating', isRequired: true, targetScope: 'all' });
  const question = copies.find(item => item.courseId === course.id);
  await api('POST', 'satisfaction-responses', { responses: [{
    courseId: course.id, questionId: question.id, loginCode: `rating-${info.project.name}`,
    studentName: 'سجل الاستبيان', ratingValue: 8,
  }] });
  await page.goto('dashboard?panel=satisfaction');
  await page.locator('.satisfaction-admin__select .v-field').click();
  await page.getByRole('option').filter({ hasText: title }).click();
  const card = page.locator('.satisfaction-admin__metric-card').filter({ hasText: prompt });
  await card.locator('.satisfaction-admin__delete-indicator').click();
  await expect(card).toHaveCount(0);
  const future = await api('POST', 'courses', { title: `بعد الحذف ${info.project.name}`, isActive: false });
  const snapshot = await api('GET', 'snapshot');
  expect(snapshot.satisfactionQuestions.filter(item => item.prompt === prompt)).toEqual([]);
  expect(snapshot.satisfactionQuestions.some(item => item.courseId === future.id && item.prompt === prompt)).toBe(false);
  expect(snapshot.satisfactionResponses.some(item => item.questionId === question.id && item.ratingValue === 8)).toBe(true);
});
