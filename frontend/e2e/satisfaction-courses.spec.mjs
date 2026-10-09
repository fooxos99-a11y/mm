import { expect, test } from './support/isolatedTest.mjs';
import { login } from './support/gesture-helpers.mjs';

test.use({ screenshot: 'off' });

test('satisfaction includes courses with closed post tests and inherits general questions', async ({ page, context }, testInfo) => {
  await login(page);
  const apiOrigin = new URL(process.env.VUE_APP_API_BASE_URL).origin;
  const csrf = (await context.cookies(apiOrigin)).find((cookie) => cookie.name === 'XSRF-TOKEN');
  const headers = { Referer: page.url(), 'X-XSRF-TOKEN': decodeURIComponent(csrf.value) };
  const title = `مدخل القرآن - ${testInfo.project.name}`;
  const created = await page.request.post(`${apiOrigin}/api/dashboard/courses`, { headers, data: { title, isActive: false } });
  expect(created.status()).toBe(201);
  const course = await created.json();
  const closed = await page.request.put(`${apiOrigin}/api/dashboard/courses/${course.id}`, { headers, data: { isPostEnabled: false } });
  expect(closed.ok()).toBeTruthy();
  const prompt = `سؤال رضا عام - ${testInfo.project.name}`;
  const question = await page.request.post(`${apiOrigin}/api/dashboard/satisfaction-questions`, {
    headers, data: { prompt, type: 'rating', isRequired: true, targetScope: 'all' },
  });
  expect(question.status()).toBe(201);
  await page.goto('dashboard?panel=satisfaction');
  await page.locator('.satisfaction-admin__select .v-field').click({ timeout: 15000 });
  await page.getByRole('option').filter({ hasText: title }).click();
  await expect(page.locator('.satisfaction-admin__metrics')).toContainText(prompt);
  const width = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
  expect(width.content).toBeLessThanOrEqual(width.viewport + 1);
  const future = await page.request.post(`${apiOrigin}/api/dashboard/courses`, {
    headers, data: { title: `دورة مستقبلية - ${testInfo.project.name}`, isActive: false },
  });
  expect(future.status()).toBe(201);
  const futureCourse = await future.json();
  const snapshot = await page.request.get(`${apiOrigin}/api/dashboard/snapshot`, { headers });
  expect((await snapshot.json()).satisfactionQuestions.some((item) => item.courseId === futureCourse.id && item.prompt === prompt)).toBeTruthy();
});
