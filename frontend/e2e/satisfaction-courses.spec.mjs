import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './support/isolatedTest.mjs';
import { login } from './support/gesture-helpers.mjs';

test.use({ screenshot: 'off', actionTimeout: 20_000 });

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


test('satisfaction dialog uses real courses, a solid toggle and saves course and general questions', async ({ page, context }, info) => {
  await login(page);
  const origin = new URL(process.env.VUE_APP_API_BASE_URL).origin;
  const csrf = (await context.cookies(origin)).find(cookie => cookie.name === 'XSRF-TOKEN');
  const headers = { Referer: page.url(), 'X-XSRF-TOKEN': decodeURIComponent(csrf.value) };
  const response = await page.request.post(origin + '/api/dashboard/courses', { headers, data: { title: 'دورة لاختبار اختيار الاستبيان', isActive: false } });
  expect(response.status()).toBe(201);
  const course = await response.json();
  await page.goto('dashboard?panel=satisfaction');
  for (const general of [false, true]) {
    await page.locator('.dashboard-topbar').getByRole('button', { name: 'إضافة', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/اختر ما إذا/)).toHaveCount(0);
    await expect(dialog.locator('.app-select')).toHaveCount(2);
    await dialog.getByRole('textbox', { name: 'نص السؤال', exact: true }).fill(general ? 'رضا جميع الدورات' : 'رضا دورة واحدة');
    const toggle = dialog.getByRole('checkbox', { name: 'سؤال إلزامي', exact: true });
    await expect(toggle).toBeChecked();
    await expect.poll(() => dialog.locator('.v-switch__track').evaluate(el => ({ color: getComputedStyle(el).backgroundColor, opacity: getComputedStyle(el).opacity }))).toEqual({ color: 'rgb(29, 106, 133)', opacity: '1' });
    await dialog.getByRole('combobox', { name: 'الدورة', exact: true }).locator('xpath=ancestor::div[contains(@class,"v-field")][1]').click();
    await expect(page.getByRole('option', { name: 'دورة محددة', exact: true })).toHaveCount(0);
    await page.getByRole('option', { name: general ? 'جميع الدورات' : course.title, exact: true }).click();
    await expect(page.locator('.app-dropdown-menu').filter({ visible: true })).toHaveCount(0);
    if (!general) await toggle.uncheck();
    await expect.poll(() => dialog.locator('.v-switch__track').evaluate(el => getComputedStyle(el).backgroundColor)).toBe(general ? 'rgb(29, 106, 133)' : 'rgb(221, 229, 235)');
    const add = dialog.getByRole('button', { name: 'إضافة', exact: true });
    const cancel = dialog.getByRole('button', { name: 'إلغاء', exact: true });
    expect((await add.boundingBox()).x).toBeLessThan((await cancel.boundingBox()).x);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width + 1);
  const accessibility = await new AxeBuilder({ page }).include('.satisfaction-admin__dialog').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
    await page.screenshot({ path: info.outputPath(general ? 'satisfaction-all.png' : 'satisfaction-course.png'), fullPage: false });
    const saved = page.waitForResponse(res => res.url().endsWith('/satisfaction-questions') && res.request().method() === 'POST');
    await add.click();
    const result = await saved;
    expect(result.status()).toBe(201);
    expect(result.request().postDataJSON()).toMatchObject({ targetScope: general ? 'all' : 'course', isRequired: general });
    if (!general) expect(result.request().postDataJSON().courseId).toBe(course.id);
    await expect(dialog).toHaveCount(0);
  }
  await page.reload();
  await page.locator('.satisfaction-admin__select .v-field').click();
  await page.getByRole('option', { name: course.title, exact: true }).click();
  await expect(page.locator('.satisfaction-admin__metrics')).toContainText('رضا دورة واحدة');
  await expect(page.locator('.satisfaction-admin__metrics')).toContainText('رضا جميع الدورات');
});
