import { expect, test } from './support/isolatedTest.mjs';
import { createAssessmentAttempt, completeAttempt } from './support/assessmentAttemptFixture.mjs';

for (const type of ['pre', 'post', 'tasks', 'final']) {
  test(`${type} retains failed answers and confirms saved file-only attempts despite a refresh outage`, async ({ page, context }, info) => {
    const { origin, questions, course } = await createAssessmentAttempt(page, context, type, info.project.name.replace(/\D/g, ''));
    await completeAttempt(page, questions);
    const endpoint = type === 'final' ? '/public/final-exam/submissions' : '/public/assessment-submissions';
    let requests = 0;
    await page.route(`**/api${endpoint}`, async route => {
      requests++;
      if (requests === 1) await route.abort('failed');
      else await route.continue();
    });
    const submit = page.locator('.assessment-submit-row').getByRole('button', { name: 'إرسال', exact: true });
    await submit.click();
    await expect(page.locator('.assessment-alert--error')).toBeVisible();
    await expect(page.getByRole('button', { name: 'الثاني', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.assessment-question__file-name')).toContainText('answer.pdf');
    await expect(submit).toBeEnabled();
    await page.route('**/api/public/snapshot**', route => route.abort('failed'));
    if (type === 'post') {
      await page.route('**/api/public/satisfaction-responses', route => route.fulfill({
        status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'audit survey unavailable' }),
      }), { times: 1 });
    }
    const accepted = page.waitForResponse(response => response.url().endsWith(endpoint) && response.status() === 201);
    await submit.click();
    const savedId = (await (await accepted).json()).id;
    if (type === 'post') {
      await expect(page.locator('.assessment-alert--error')).toHaveText('audit survey unavailable');
      await expect(page.locator('.assessment-satisfaction textarea').first()).toHaveValue('رأي محفوظ');
      const surveySaved = page.waitForResponse(response => response.url().endsWith('/public/satisfaction-responses') && response.status() === 200);
      await submit.click();
      await surveySaved;
    }
    await expect(page.locator('.assessment-state--success')).toContainText('تم الإرسال');
    await expect(page.locator('.assessment-alert--error')).toHaveCount(0);
    await expect(submit).toHaveCount(0);
    expect(requests).toBe(2);
    const response = await page.request.get(`${origin}/api/dashboard/snapshot`, { headers: { Referer: page.url() } });
    expect(response.status()).toBe(200);
    const snapshot = await response.json();
    const saved = snapshot[type === 'final' ? 'finalExamSubmissions' : 'submissions'].find(item => item.id === savedId);
    expect(saved).toBeTruthy();
    for (const question of questions) {
      const answer = saved.answers.find(item => item.questionId === question.id);
      expect(answer.value || '').toBe(question.type === 'text' ? '' : question.options[1]);
      if (question.type === 'text') {
        expect(answer.fileName).toBe('answer.pdf');
        const attachment = await page.request.get(answer.fileDataUrl);
        expect(attachment.status()).toBe(200);
        expect((await attachment.body()).toString()).toBe('%PDF-1.4\n%%EOF');
      }
    }
    if (type === 'post') expect(snapshot.satisfactionResponses.filter(item => item.courseId === course.id)).toHaveLength(2);
    await page.unroute('**/api/public/snapshot**');
    await page.reload();
    await expect(page.locator('.assessment-state--success')).toContainText('تم الإرسال');
  });

  test(`${type} recovers a confirmation lost after the server has saved the answers`, async ({ page, context }, info) => {
    const { origin, course, loginId, questions } = await createAssessmentAttempt(page, context, type, info.project.name.replace(/\D/g, ''));
    await completeAttempt(page, questions);
    const endpoint = type === 'final' ? '/public/final-exam/submissions' : '/public/assessment-submissions';
    let requests = 0;
    await page.route(`**/api${endpoint}`, async route => {
      requests++;
      const saved = await route.fetch();
      expect(saved.status()).toBe(201);
      await route.abort('failed');
    });
    const submit = page.locator('.assessment-submit-row').getByRole('button', { name: 'إرسال', exact: true });
    await submit.click();
    if (type === 'post') {
      await expect(page.locator('.assessment-alert--error')).toHaveText('تم حفظ الاختبار. أعد الإرسال لاستكمال استبيان الرضا.');
      await expect(page.locator('.assessment-satisfaction textarea').first()).toHaveValue('رأي محفوظ');
      await submit.click();
    }
    await expect(page.locator('.assessment-state--success')).toContainText('تم الإرسال');
    await expect(page.locator('.assessment-alert--error')).toHaveCount(0);
    expect(requests).toBe(1);
    await page.reload();
    await expect(page.locator('.assessment-state--success')).toContainText('تم الإرسال');
    const snapshot = await (await page.request.get(`${origin}/api/dashboard/snapshot`, { headers: { Referer: page.url() } })).json();
    const attempts = snapshot[type === 'final' ? 'finalExamSubmissions' : 'submissions'].filter(item => (
      type === 'final' ? item.loginCode === loginId : item.courseId === course.id && item.assessmentType === type
    ));
    expect(attempts).toHaveLength(1);
    expect(attempts[0].answers.length).toBeGreaterThanOrEqual(3);
  });
}
