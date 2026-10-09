import { expect, test } from './support/isolatedTest.mjs';
import { login } from './support/gesture-helpers.mjs';
import { studentPassword } from './support/credentials.mjs';

test.use({ screenshot: 'off' });

for (const [typeIndex, assessmentType] of ['pre', 'post', 'tasks', 'final'].entries()) {
  test(`student ${assessmentType} displays saved question types and submits the exact selected answers`, async ({ page, context }, info) => {
    const browserErrors = [];
    page.on('pageerror', error => browserErrors.push(error.message));
    await login(page);
    const origin = new URL(process.env.VUE_APP_API_BASE_URL).origin;
    const token = (await context.cookies(origin)).find(cookie => cookie.name === 'XSRF-TOKEN');
    const headers = { Referer: page.url(), 'X-XSRF-TOKEN': decodeURIComponent(token.value) };
    const api = async (method, route, data) => {
      const response = await page.request.fetch(`${origin}/api${route}`, { method, headers, data });
      expect(response.ok(), `Fixture ${route}: ${response.status()}`).toBeTruthy();
      return response.status() === 204 ? null : response.json();
    };
    const suffix = info.project.name.replace(/\D/g, '');
    const loginId = `84${typeIndex}${suffix.padStart(7, '0')}`;
    // Admin editor tests use female; student attempts share one immutable male exam across viewports.
    const branchId = 'male';
    await api('POST', '/students', { name: `طالب الأنواع ${loginId}`, loginId,
      password: studentPassword, passwordConfirmation: studentPassword, branchId });
    const course = assessmentType === 'final' ? null : await api('POST', '/dashboard/courses', {
      title: `مطابقة أنواع الأسئلة ${assessmentType} ${suffix}`,
      entityType: assessmentType === 'tasks' ? 'task' : 'course', isActive: assessmentType !== 'tasks',
    });
    const definitions = [
      { type: 'multiple', prompt: `سؤال الخيارات ${loginId}`, options: ['خيار أول طويل '.repeat(14).trim(), 'الخيار الثاني'], correctAnswer: 'الخيار الثاني' },
      { type: 'truefalse', prompt: `سؤال صح أو خطأ ${loginId}`, options: ['صح', 'خطأ'], correctAnswer: 'خطأ' },
      { type: 'text', prompt: `السؤال النصي ${loginId}`, options: [], correctAnswer: '' },
    ];
    if (assessmentType === 'final') {
      for (const definition of definitions) definition.prompt = `عرض أنواع النهائي: ${definition.type}`;
    }
    const existingFinalQuestions = assessmentType === 'final'
      ? (await api('GET', '/dashboard/snapshot')).finalExamQuestions.filter(question => question.branchCode === branchId) : [];
    const questions = [];
    for (const definition of definitions) {
      const existing = existingFinalQuestions.find(question => question.prompt === definition.prompt);
      const question = existing || await api('POST', assessmentType === 'final' ? '/dashboard/final-exam/questions'
        : `/dashboard/courses/${course.id}/questions`, {
        ...definition, assessmentType, branchCode: branchId, allowFile: false, points: 2,
      });
      questions.push({ ...definition, id: question.id });
    }
    if (assessmentType === 'final') {
      await api('PUT', `/dashboard/final-exam/settings/${branchId}`, {
        isEnabled: true, closesAt: '2030-12-31T21:00:00.000Z', notificationTemplate: '',
      });
    } else if (assessmentType === 'tasks') {
      await api('PUT', `/dashboard/courses/${course.id}`, { isTasksEnabled: true });
    }
    await page.goto('about:blank');
    await context.clearCookies();
    await login(page, loginId, studentPassword);
    await page.goto(assessmentType === 'final' ? 'final-exam' : assessmentType === 'tasks'
      ? `tasks?taskId=${course.id}` : `course/${assessmentType}`);

    for (const question of questions) {
      const card = page.locator('.assessment-question').filter({ hasText: question.prompt });
      await expect(card).toBeVisible();
      if (question.type === 'text') {
        await expect(card.locator('button.assessment-option')).toHaveCount(0);
        await expect(card.locator('textarea')).toHaveCount(1);
        await card.locator('textarea').fill('إجابة نصية محفوظة');
      } else {
        await expect(card.locator('textarea')).toHaveCount(0);
        await expect(card.locator('button.assessment-option')).toHaveText(question.options);
        await card.getByRole('button', { name: question.options[0], exact: true }).click();
        await expect(card.getByRole('button', { name: question.options[0], exact: true })).toHaveAttribute('aria-pressed', 'true');
        await card.getByRole('button', { name: question.options[1], exact: true }).click();
        await expect(card.getByRole('button', { name: question.options[0], exact: true })).toHaveAttribute('aria-pressed', 'false');
        await expect(card.getByRole('button', { name: question.options[1], exact: true })).toHaveAttribute('aria-pressed', 'true');
      }
    }
    // The final exam may also include seeded questions; complete them through their actual controls.
    if (assessmentType === 'final') {
      const cards = page.locator('.assessment-question');
      for (let index = 0; index < await cards.count(); index++) {
        const card = cards.nth(index);
        if (await card.locator('button[aria-pressed="true"]').count()) continue;
        if (await card.locator('textarea').count()) {
          if (!(await card.locator('textarea').inputValue()).trim()) await card.locator('textarea').fill('إجابة سؤال إضافي');
        } else await card.locator('button.assessment-option').first().click();
      }
    }
    const survey = page.locator('.assessment-satisfaction');
    for (let index = 0; index < await survey.locator('textarea').count(); index++) {
      await survey.locator('textarea').nth(index).fill('راضٍ عن الدورة');
    }
    for (let index = 0; index < await survey.getByRole('slider').count(); index++) {
      await survey.getByRole('slider').nth(index).focus();
      await survey.getByRole('slider').nth(index).press('End');
    }
    const dimensions = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
    const submissionResponse = page.waitForResponse(response => response.request().method() === 'POST'
      && response.url().endsWith(assessmentType === 'final' ? '/public/final-exam/submissions' : '/public/assessment-submissions'));
    await page.locator('.assessment-submit-row').getByRole('button', { name: 'إرسال', exact: true }).click();
    const response = await submissionResponse;
    expect(response.status()).toBe(201);
    const submission = await response.json();
    const savedResponse = await page.request.get(`${origin}/api/dashboard/snapshot`, { headers: { Referer: page.url() } });
    expect(savedResponse.status()).toBe(200);
    const snapshot = await savedResponse.json();
    const saved = snapshot[assessmentType === 'final' ? 'finalExamSubmissions' : 'submissions'].find(item => item.id === submission.id);
    for (const question of questions) {
      expect(saved.answers.find(answer => answer.questionId === question.id).value)
        .toBe(question.type === 'text' ? 'إجابة نصية محفوظة' : question.options[1]);
    }
    expect(browserErrors).toEqual([]);
  });
}
