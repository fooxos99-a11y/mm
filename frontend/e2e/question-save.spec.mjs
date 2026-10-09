import { expect, test } from './support/isolatedTest.mjs';
import { login } from './support/gesture-helpers.mjs';

test.use({ screenshot: 'off' });

for (const assessmentType of ['pre', 'post', 'tasks']) {
  test(`saved ${assessmentType} questions remain visible and editable for every question type`, async ({ page, context }, info) => {
    await login(page);
    const origin = new URL(process.env.VUE_APP_API_BASE_URL).origin;
    const token = (await context.cookies(origin)).find(cookie => cookie.name === 'XSRF-TOKEN');
    const title = `حفظ الأسئلة ${assessmentType} ${info.project.name}`;
    const response = await page.request.post(`${origin}/api/dashboard/courses`, {
      headers: { Referer: page.url(), 'X-XSRF-TOKEN': decodeURIComponent(token.value) },
      data: { title, entityType: assessmentType === 'tasks' ? 'task' : 'course', isActive: false },
    });
    expect(response.status()).toBe(201);
    const course = await response.json();
    await page.goto(assessmentType === 'tasks' ? 'dashboard?panel=tasks'
      : `dashboard?panel=courses&courseId=${course.id}&assessmentType=${assessmentType}`);
    if (assessmentType === 'tasks') {
      await page.locator('.assessment-select:visible').first().locator('.v-field').click();
      await page.getByText(title, { exact: true }).click();
    } else {
      await page.locator('.assessment-select:visible').last().locator('.v-field').click();
      await page.getByRole('option').filter({ hasText: assessmentType === 'pre' ? 'الاختبار القبلي' : 'الاختبار البعدي' }).click();
    }
    for (const [index, type] of ['خيارات', 'صح أو خطأ', 'نصي'].entries()) {
      await page.locator('.assessment-inline-builder__add').click();
      await page.locator('.assessment-inline-builder__menu-item').getByText(type, { exact: true }).click();
      const form = page.locator('.assessment-form-card--inline').filter({ has: page.locator(`#assessment-new-question-${index}-prompt`) });
      await form.locator('input[placeholder="اكتب السؤال"]').fill(`سؤال ${type}`);
      if (type === 'خيارات') {
        await form.locator('input[placeholder="الخيار 1"]').fill('الأول');
        await form.locator('input[placeholder="الخيار 2"]').fill('الثاني');
      }
      if (type !== 'نصي') await form.getByRole('button', { name: 'تحديد الخيار 1 إجابة صحيحة', exact: true }).click();
    }
    // A successful save must publish server IDs even if dashboard refresh is unavailable.
    await page.route('**/api/dashboard/snapshot**', route => route.abort());
    const save = page.waitForResponse(item => item.url().endsWith(`/courses/${course.id}/questions/sync`));
    await page.getByRole('button', { name: 'حفظ', exact: true }).click();
    expect((await save).status()).toBe(200);
    const saved = page.locator('.assessment-inline-list__item');
    await expect(saved).toHaveCount(3);
    for (const [index, type] of ['خيارات', 'صح أو خطأ', 'نصي'].entries()) {
      await expect(saved.nth(index).locator('input[placeholder="اكتب السؤال"]')).toHaveValue(`سؤال ${type}`);
      await saved.nth(index).locator('input[placeholder="اكتب السؤال"]').fill(`تعديل ${type}`);
    }
    const edit = page.waitForResponse(item => item.url().endsWith(`/courses/${course.id}/questions/sync`));
    await page.getByRole('button', { name: 'حفظ', exact: true }).click();
    expect((await edit).status()).toBe(200);
    await expect(saved.nth(0).locator('input[placeholder="اكتب السؤال"]')).toHaveValue('تعديل خيارات');
    await page.unroute('**/api/dashboard/snapshot**');
    await page.reload();
    if (assessmentType === 'tasks') {
      await page.locator('.assessment-select:visible').first().locator('.v-field').click();
      await page.getByText(title, { exact: true }).click();
    } else {
      await page.locator('.assessment-select:visible').last().locator('.v-field').click();
      await page.getByRole('option').filter({ hasText: assessmentType === 'pre' ? 'الاختبار القبلي' : 'الاختبار البعدي' }).click();
    }
    await expect(saved).toHaveCount(3);
    for (const [index, type] of ['خيارات', 'صح أو خطأ', 'نصي'].entries()) {
      await expect(saved.nth(index).locator('input[placeholder="اكتب السؤال"]')).toHaveValue(`تعديل ${type}`);
    }
    await expect(saved.nth(1).locator('input[placeholder="الخيار 1"]')).toHaveValue('صح');
    await expect(saved.nth(1).locator('input[placeholder="الخيار 2"]')).toHaveValue('خطأ');
  });
}

test('final exam saves and edits all question types without losing true/false options', async ({ page }, info) => {
  await login(page);
  await page.goto('dashboard?panel=finalexam');
  await page.locator('.assessment-select:visible .v-field').click();
  await page.getByRole('option').filter({ hasText: 'معلمات' }).click();
  const prompts = ['خيارات', 'صح أو خطأ', 'نصي'].map(type => `نهائي ${type} ${info.project.name}`);
  for (const [index, type] of ['خيارات', 'صح أو خطأ', 'نصي'].entries()) {
    await page.locator('.assessment-inline-builder__add').click();
    await page.getByRole('button', { name: type, exact: true }).click();
    const form = page.locator('.assessment-inline-builder .assessment-form-card').nth(index);
    await form.locator('input[placeholder="اكتب السؤال"]').fill(prompts[index]);
    if (type === 'خيارات') {
      await form.locator('input[placeholder="الخيار 1"]').fill('الأول');
      await form.locator('input[placeholder="الخيار 2"]').fill('الثاني');
    }
    if (type !== 'نصي') await form.getByRole('button', { name: 'تحديد الخيار 1 إجابة صحيحة', exact: true }).click();
  }
  await page.route('**/api/dashboard/snapshot**', route => route.abort());
  let additions = 0;
  await page.route('**/api/dashboard/final-exam/questions', async route => {
    additions++;
    if (additions === 2) {
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Save interrupted' }) });
    } else await route.continue();
  });
  await page.getByRole('button', { name: 'حفظ', exact: true }).click();
  await expect(page.locator('.assessment-inline-builder .assessment-form-card')).toHaveCount(2);
  await expect.poll(() => page.locator('.assessment-inline-list__item input[placeholder="اكتب السؤال"]')
    .evaluateAll(inputs => inputs.map(input => input.value))).toContain(prompts[0]);
  await page.unroute('**/api/dashboard/final-exam/questions');
  await page.getByRole('button', { name: 'حفظ', exact: true }).click();
  await expect(page.locator('.assessment-inline-builder .assessment-form-card')).toHaveCount(0);
  const cards = page.locator('.assessment-inline-list__item');
  const values = () => cards.locator('input[placeholder="اكتب السؤال"]').evaluateAll(inputs => inputs.map(input => input.value));
  for (const prompt of prompts) await expect.poll(values).toContain(prompt);
  const edited = [];
  page.on('response', response => {
    if (/\/final-exam\/questions\/[^/]+$/.test(response.url()) && response.request().method() === 'PUT') {
      edited.push(response.status());
    }
  });
  for (let index = 0; index < await cards.count(); index += 1) {
    const input = cards.nth(index).locator('input[placeholder="اكتب السؤال"]');
    const prompt = await input.inputValue();
    if (prompts.includes(prompt)) await input.fill(`تعديل ${prompt}`);
  }
  await page.getByRole('button', { name: 'حفظ', exact: true }).click();
  await expect.poll(() => edited.length).toBe(3);
  expect(edited).toEqual([204, 204, 204]);
  await page.unroute('**/api/dashboard/snapshot**');
  await page.reload();
  await page.locator('.assessment-select:visible .v-field').click();
  await page.getByRole('option').filter({ hasText: 'معلمات' }).click();
  for (const prompt of prompts) await expect.poll(values).toContain(`تعديل ${prompt}`);
  for (let index = 0; index < await cards.count(); index += 1) {
    const card = cards.nth(index);
    if (await card.locator('input[placeholder="اكتب السؤال"]').inputValue() === `تعديل ${prompts[1]}`) {
      await expect(card.locator('input[placeholder="الخيار 1"]')).toHaveValue('صح');
      await expect(card.locator('input[placeholder="الخيار 2"]')).toHaveValue('خطأ');
      await expect(card.getByRole('button', { name: 'تحديد الخيار 1 إجابة صحيحة', exact: true })).toHaveAttribute('aria-pressed', 'true');
    }
  }
});
