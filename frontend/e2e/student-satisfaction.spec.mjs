import { expect, test } from './support/isolatedTest.mjs';
import { createAssessmentAttempt } from './support/assessmentAttemptFixture.mjs';

const openSurvey = async (page, context, info) => {
  const { origin, course, questions, loginId } = await createAssessmentAttempt(page, context, 'post', info.project.name.replace(/\D/g, ''));
  const token = (await context.cookies(origin)).find(cookie => cookie.name === 'XSRF-TOKEN');
  const headers = { Referer: page.url(), 'X-XSRF-TOKEN': decodeURIComponent(token.value) };
  const submitted = await page.request.post(`${origin}/api/public/assessment-submissions`, { headers, data: {
    courseId: course.id, assessmentType: 'post', loginId, studentName: 'Student',
    answers: questions.map(question => ({ questionId: question.id, value: question.type === 'text' ? 'نص' : question.options[1] })),
  } });
  expect(submitted.status()).toBe(201);
  await page.goto('satisfaction');
  return { origin, course };
};

test('student can save the separate satisfaction page and select the lowest rating', async ({ page, context }, info) => {
  const { origin, course } = await openSurvey(page, context, info);
  const slider = page.getByRole('slider', { name: 'رضا الاستعادة rating', exact: true });
  await expect(slider).toBeVisible();
  await slider.click();
  await expect(page.locator('.assessment-rating-bar__value')).toHaveText('1');
  await slider.press('End');
  await slider.press('Home');
  await expect(page.locator('.assessment-rating-bar__value')).toHaveText('1');
  await page.getByRole('textbox', { name: 'رضا الاستعادة text', exact: true }).fill('رأي محفوظ');
  const saved = page.waitForResponse(response => response.url().includes('/satisfaction-responses') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'إرسال الاستبيان', exact: true }).click();
  const response = await saved;
  expect(response.status()).toBe(200);
  expect(response.url()).toContain('/api/public/satisfaction-responses');
  await expect(page.locator('.assessment-alert--success')).toContainText('تم استلام استبيان الرضا');
  await page.reload();
  await expect(page.locator('.assessment-alert--success')).toContainText('تم استلام استبيان الرضا');
  const snapshot = await (await page.request.get(`${origin}/api/dashboard/snapshot`, { headers: { Referer: page.url() } })).json();
  expect(snapshot.satisfactionResponses.find(item => item.courseId === course.id && item.ratingValue != null)?.ratingValue).toBe(1);
  expect(snapshot.satisfactionResponses.find(item => item.courseId === course.id && item.textValue)?.textValue).toBe('رأي محفوظ');
});

test('separate survey recovers when its saved confirmation is lost', async ({ page, context }, info) => {
  const { origin, course } = await openSurvey(page, context, info);
  await page.getByRole('slider', { name: 'رضا الاستعادة rating', exact: true }).press('Home');
  await page.getByRole('textbox', { name: 'رضا الاستعادة text', exact: true }).fill('رأي محفوظ');
  let requests = 0;
  await page.route('**/api/public/satisfaction-responses', async route => {
    requests++;
    expect((await route.fetch()).status()).toBe(200);
    await route.abort('failed');
  });
  await page.getByRole('button', { name: 'إرسال الاستبيان', exact: true }).click();
  await expect(page.locator('.assessment-alert--success')).toContainText('تم استلام استبيان الرضا');
  expect(requests).toBe(1);
  await page.reload();
  await expect(page.locator('.assessment-alert--success')).toContainText('تم استلام استبيان الرضا');
  const snapshot = await (await page.request.get(`${origin}/api/dashboard/snapshot`, { headers: { Referer: page.url() } })).json();
  expect(snapshot.satisfactionResponses.filter(item => item.courseId === course.id)).toHaveLength(2);
});
