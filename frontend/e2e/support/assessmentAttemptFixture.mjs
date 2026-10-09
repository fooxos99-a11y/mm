import { expect } from '@playwright/test';
import { login } from './gesture-helpers.mjs';
import { studentPassword } from './credentials.mjs';

export async function createAssessmentAttempt(page, context, type, suffix) {
  await login(page);
  const origin = new URL(process.env.VUE_APP_API_BASE_URL).origin;
  const token = (await context.cookies(origin)).find(cookie => cookie.name === 'XSRF-TOKEN');
  const headers = { Referer: page.url(), 'X-XSRF-TOKEN': decodeURIComponent(token.value) };
  const api = async (method, route, data) => {
    const response = await page.request.fetch(`${origin}/api${route}`, { method, headers, data });
    expect(response.ok(), `Fixture ${route}: ${response.status()}`).toBeTruthy();
    return response.status() === 204 ? null : response.json();
  };
  const loginId = `91${['pre', 'post', 'tasks', 'final'].indexOf(type)}${suffix.padStart(7, '0')}`;
  await api('POST', '/students', { name: 'طالب استعادة التسليم', loginId, branchId: 'male',
    password: studentPassword, passwordConfirmation: studentPassword });
  const course = type === 'final' ? null : await api('POST', '/dashboard/courses', {
    title: `استعادة ${type}`, entityType: type === 'tasks' ? 'task' : 'course', isActive: type !== 'tasks',
  });
  const definitions = [
    { prompt: 'خيار الاستعادة', type: 'multiple', options: ['الأول', 'الثاني'], correctAnswer: 'الثاني', allowFile: false },
    { prompt: 'صح وخطأ الاستعادة', type: 'truefalse', options: ['صح', 'خطأ'], correctAnswer: 'خطأ', allowFile: false },
    { prompt: 'إجابة الاستعادة بالمرفق', type: 'text', options: [], correctAnswer: '', allowFile: true },
  ];
  const questions = [];
  for (const definition of definitions) {
    const question = await api('POST', type === 'final' ? '/dashboard/final-exam/questions'
      : `/dashboard/courses/${course.id}/questions`, { ...definition, assessmentType: type, branchCode: 'male', points: 2 });
    questions.push({ ...definition, id: question.id });
  }
  if (type === 'final') {
    await api('PUT', '/dashboard/final-exam/settings/male', { isEnabled: true, closesAt: '2030-12-31T21:00:00.000Z' });
  } else if (type === 'tasks') {
    await api('PUT', `/dashboard/courses/${course.id}`, { isTasksEnabled: true });
  } else if (type === 'post') {
    for (const questionType of ['rating', 'text']) {
      await api('POST', '/dashboard/satisfaction-questions', {
        prompt: `رضا الاستعادة ${questionType}`, type: questionType, isRequired: true, targetScope: 'course', courseId: course.id,
      });
    }
  }
  await page.goto('about:blank');
  await context.clearCookies();
  await login(page, loginId, studentPassword);
  await page.goto(type === 'final' ? 'final-exam' : type === 'tasks' ? `tasks?taskId=${course.id}` : `course/${type}`);
  return { origin, questions, loginId, course };
}

export async function completeAttempt(page, questions) {
  for (const question of questions) {
    const card = page.locator('.assessment-question').filter({ hasText: question.prompt });
    if (question.type === 'text') {
      await card.locator('input[type=file]').setInputFiles({ name: 'answer.pdf', mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4\n%%EOF') });
      await expect(card).toContainText('answer.pdf');
      await expect(card.locator('textarea')).toHaveValue('');
    } else {
      await card.getByRole('button', { name: question.options[1], exact: true }).click();
    }
  }
  // Complete any seed questions, without altering the answers under test.
  const cards = page.locator('.assessment-question').filter({ has: page.locator('.assessment-question-answer') });
  for (let index = 0; index < await cards.count(); index++) {
    const card = cards.nth(index);
    if (await card.locator('button[aria-pressed=true]').count() || await card.locator('input[type=file]').count()) continue;
    if (await card.locator('textarea').count()) await card.locator('textarea').fill('إجابة إضافية');
    else await card.locator('button.assessment-option').first().click();
  }
  const survey = page.locator('.assessment-satisfaction');
  for (const slider of await survey.getByRole('slider').all()) {
    await expect(slider).toHaveAccessibleName(/رضا الاستعادة/);
    await slider.click();
    const name = await slider.getAttribute('aria-label');
    await expect(survey.locator('.assessment-rating-bar').filter({ has: page.getByRole('slider', { name, exact: true }) })
      .locator('.assessment-rating-bar__value')).toHaveText('1');
    await slider.press('Home');
    await slider.press('End');
    await expect(slider).toHaveAttribute('aria-valuenow', '10');
  }
  for (const textarea of await survey.locator('textarea').all()) await textarea.fill('رأي محفوظ');
}
