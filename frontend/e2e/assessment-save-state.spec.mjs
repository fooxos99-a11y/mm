import { expect, test } from './support/isolatedTest.mjs';
import { login, selectOption } from './support/gesture-helpers.mjs';

async function api(page, context, method, route, data) {
  const origin = new URL(process.env.VUE_APP_API_BASE_URL).origin;
  const token = (await context.cookies(origin)).find(cookie => cookie.name === 'XSRF-TOKEN');
  const response = await page.request.fetch(`${origin}/api/dashboard/${route}`, {
    method, data, headers: { Accept: 'application/json', Referer: page.url(), 'X-XSRF-TOKEN': decodeURIComponent(token.value) },
  });
  expect(response.ok(), `${route}: ${response.status()} ${await response.text()}`).toBeTruthy();
  return response.status() === 204 ? null : response.json();
}

async function choose(page, id, label) {
  await page.locator('.app-select').filter({ has: page.locator(`#${id}`) }).locator('.v-field').click();
  await selectOption(page, label, { exact: true });
}

for (const type of ['pre', 'post', 'tasks', 'final']) {
  test(`${type} save stays disabled until content changes and resets after saving`, async ({ page, context }) => {
    await login(page);
    if (type === 'final') await page.goto('dashboard?panel=finalexam');
    else {
      const course = await api(page, context, 'POST', 'courses', {
        title: `حالة الحفظ ${type}`, entityType: type === 'tasks' ? 'task' : 'course', isActive: false,
      });
      await page.goto(`dashboard?panel=${type === 'tasks' ? 'tasks' : 'courses'}&courseId=${course.id}`);
      if (type === 'tasks') await choose(page, 'assessment-toolbar-course', course.title);
      else await choose(page, 'assessment-toolbar-mode', type === 'pre' ? 'الاختبار القبلي' : 'الاختبار البعدي');
    }
    const save = page.locator('.assessment-inline-builder__actions').getByRole('button', { name: 'حفظ', exact: true });
    await expect(save).toBeDisabled();
    await expect(save).toHaveCSS('color', 'rgb(255, 255, 255)');
    await page.locator('.assessment-inline-builder__add').click();
    await page.getByRole('button', { name: 'نصي', exact: true }).click();
    const newPrompt = page.locator('#assessment-new-question-0-prompt');
    await expect(save).toBeDisabled();
    await newPrompt.fill('سؤال حالة الحفظ');
    await expect(save).toBeEnabled();
    await newPrompt.fill('');
    await expect(save).toBeDisabled();
    await newPrompt.fill('سؤال حالة الحفظ');
    await save.click();
    await expect(newPrompt).toHaveCount(0);
    await expect(save).toBeDisabled();
    const cards = page.locator('.assessment-inline-list__item');
    let card;
    for (const candidate of await cards.all()) {
      if (await candidate.locator('textarea[placeholder="اكتب السؤال"]').inputValue() === 'سؤال حالة الحفظ') card = candidate;
    }
    expect(card).toBeTruthy();
    const prompt = card.locator('textarea[placeholder="اكتب السؤال"]');
    await prompt.fill('سؤال معدل');
    await expect(save).toBeEnabled();
    await prompt.fill('سؤال حالة الحفظ');
    await expect(save).toBeDisabled();
    await prompt.fill('سؤال معدل');
    const failurePattern = type === 'final' ? '**/final-exam/questions/*' : '**/questions/sync';
    await page.route(failurePattern, route => route.fulfill({ status: 503, json: { message: 'تعذر الحفظ مؤقتًا' } }));
    await save.click();
    await expect(page.getByText('تعذر الحفظ مؤقتًا', { exact: true })).toBeVisible();
    await expect(prompt).toHaveValue('سؤال معدل');
    await expect(save).toBeEnabled();
    await page.unroute(failurePattern);
    await save.click();
    await expect(save).toBeDisabled();
    await expect(prompt).toHaveValue('سؤال معدل');
  });
}

test('document task keeps all three controls in one row and tracks metadata and editor changes', async ({ page, context }) => {
  await login(page);
  const task = await api(page, context, 'POST', 'courses', {
    title: 'مهمة حفظ وورد', entityType: 'task', taskMode: 'document', isActive: false,
  });
  await page.goto(`dashboard?panel=tasks&courseId=${task.id}`);
  await choose(page, 'assessment-toolbar-course', task.title);
  const save = page.locator('.assessment-template-actions').getByRole('button', { name: 'حفظ', exact: true });
  const editor = page.locator('.ql-editor');
  await expect(editor).toBeVisible();
  await expect(save).toBeDisabled();
  const rectangles = await page.locator('.assessment-task-toolbar .app-filter-toolbar').evaluate(element =>
    [...element.children].map(field => {
      const control = field.querySelector('.v-field, input');
      const rect = control.getBoundingClientRect();
      return { y: rect.y, height: rect.height, left: rect.left, right: rect.right };
    }));
  expect(rectangles).toHaveLength(3);
  for (const rect of rectangles) {
    expect(Math.abs(rect.y - rectangles[0].y)).toBeLessThanOrEqual(1);
    expect(Math.abs(rect.height - rectangles[0].height)).toBeLessThanOrEqual(1);
    expect(rect.left).toBeGreaterThanOrEqual(0);
    expect(rect.right).toBeLessThanOrEqual(page.viewportSize().width);
  }
  const points = page.locator('#assessment-task-points');
  await points.fill('3');
  await expect(save).toBeEnabled();
  await points.fill('1');
  await expect(save).toBeDisabled();
  const link = page.locator('#assessment-task-video');
  await link.fill('https://example.test/task');
  await expect(save).toBeEnabled();
  await link.fill('');
  await expect(save).toBeDisabled();
  await editor.fill('محتوى المهمة');
  await expect(save).toBeEnabled();
  await editor.fill('');
  await expect(save).toBeDisabled();
  await editor.fill('محتوى محفوظ');
  await points.fill('3');
  await page.route('**/questions/sync', route => route.fulfill({ status: 503, json: { message: 'تعذر حفظ المهمة مؤقتًا' } }));
  await save.click();
  await expect(page.getByText('تعذر حفظ المهمة مؤقتًا', { exact: true })).toBeVisible();
  await expect(editor).toContainText('محتوى محفوظ');
  await expect(points).toHaveValue('3');
  await expect(save).toBeEnabled();
  await page.unroute('**/questions/sync');
  await save.click();
  await expect(save).toBeDisabled();
  await page.reload();
  await choose(page, 'assessment-toolbar-course', task.title);
  await expect(points).toHaveValue('3');
  await expect(editor).toContainText('محتوى محفوظ');
  await expect(save).toBeDisabled();
});
