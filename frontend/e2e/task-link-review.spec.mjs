import { expect, test } from './support/isolatedTest.mjs';
import { login, selectOption } from './support/gesture-helpers.mjs';
import { studentPassword } from './support/credentials.mjs';
import { expectDialogContained } from './support/dialogGeometry.mjs';

test.use({ actionTimeout: 20_000 });

for (const mode of ['questions', 'document']) {
  test(`task ${mode} saves a web link and exposes the submitted answer for manual review`, async ({ page, context }, info) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await login(page);
    const origin = new URL(process.env.VUE_APP_API_BASE_URL).origin;
    const api = async (method, route, data) => {
      const cookie = (await context.cookies(origin)).find(item => item.name === 'XSRF-TOKEN');
      const response = await page.request.fetch(`${origin}/api${route}`, {
        method, data, headers: { Accept: 'application/json', Referer: page.url(), 'X-XSRF-TOKEN': decodeURIComponent(cookie.value) },
      });
      expect(response.ok(), `${method} ${route}: ${response.status()}`).toBeTruthy();
      return response.status() === 204 ? null : response.json();
    };
    const title = `مهمة الرابط والمراجعة ${mode} ${'باسم طويل لاختبار عرض النتائج '.repeat(3)}`.trim();
    const task = await api('POST', '/dashboard/courses', {
      title, entityType: 'task', taskMode: mode, isActive: false, taskPoints: 5,
      taskTemplateContent: mode === 'document' ? '<p>اكتب إجابتك هنا</p>' : '',
    });
    if (mode === 'questions') {
      await api('POST', `/dashboard/courses/${task.id}/questions`, {
        assessmentType: 'tasks', type: 'text', prompt: 'وضح إجابتك', points: 5, options: [], correctAnswer: '', allowFile: false,
      });
    }
    const loginId = `76${mode === 'questions' ? '1' : '2'}${String(info.project.use.viewport.width).padStart(7, '0')}`;
    const name = 'طالب مراجعة المهمة باسم عربي طويل للتأكد من وضوح الإجابة';
    await api('POST', '/students', { name, loginId, branchId: 'male', password: studentPassword, passwordConfirmation: studentPassword });
    const selectTask = async () => {
      await page.locator('.assessment-select:visible').first().locator('.v-field').click();
      await selectOption(page, title, { exact: true });
    };
    let releaseEditor;
    if (mode === 'document') {
      const editorGate = new Promise(resolve => { releaseEditor = resolve; });
      await page.route('**/assets/RichTextEditor-*.js', async route => {
        await editorGate;
        await route.continue();
      });
    }
    await page.goto('dashboard?panel=tasks');
    await selectTask();
    const link = 'https://example.com/task-resource?course=arabic#instructions';
    await page.getByRole('textbox', { name: 'الرابط', exact: true }).fill(link);
    if (mode === 'document') {
      releaseEditor();
      await expect(page.locator('.ql-editor')).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'الرابط', exact: true })).toBeFocused();
      await expect(page.locator('.ql-editor')).not.toContainText(link);
    }
    const saved = page.waitForResponse(response => response.url().endsWith(`/courses/${task.id}/questions/sync`) && response.request().method() === 'PUT', { timeout: 20_000 });
    await page.getByRole('button', { name: 'حفظ', exact: true }).click();
    expect((await saved).status()).toBe(200);
    await expect(page.getByText(mode === 'questions' ? 'تم حفظ الأسئلة بنجاح' : 'تم حفظ إعدادات المهمة بنجاح', { exact: true })).toBeVisible();
    await page.reload();
    await selectTask();
    await expect(page.getByRole('textbox', { name: 'الرابط', exact: true })).toHaveValue(link);
    await api('PUT', `/dashboard/courses/${task.id}`, { isTasksEnabled: true });

    await page.goto('about:blank');
    await context.clearCookies();
    await login(page, loginId, studentPassword);
    await page.goto(`tasks?taskId=${task.id}`);
    const resource = page.getByRole('link', { name: 'فتح رابط المهمة', exact: true });
    await expect(resource).toBeVisible();
    await expect(resource).toHaveAttribute('href', link);
    await expect(resource).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(page.locator('.task-video-card')).toHaveCount(0);
    // Keep the external destination deterministic; application data uses the real local API.
    await context.route('https://example.com/task-resource**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Task resource</h1>' }));
    const opened = page.waitForEvent('popup');
    await resource.click();
    const popup = await opened;
    await expect(popup).toHaveURL(link);
    await popup.close();
    const answer = 'هذه إجابة الطالب المحفوظة للمراجعة والتصحيح';
    if (mode === 'document') {
      await page.locator('.ql-editor').fill(answer);
      await page.locator('.ql-editor').press('ControlOrMeta+A');
      await page.locator('.ql-bold').click();
    } else {
      await page.locator('.assessment-question textarea').fill(answer);
    }
    const sent = page.waitForResponse(response => response.url().endsWith('/public/assessment-submissions') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'إرسال', exact: true }).click();
    expect((await sent).status()).toBe(201);
    await expect(page.getByText('تم الإرسال', { exact: true })).toBeVisible();
    await page.reload();
    await expect(resource).toBeVisible();
    await page.screenshot({ path: info.outputPath(`${mode}-student-link.png`), fullPage: true });

    await page.goto('about:blank');
    await context.clearCookies();
    await login(page);
    await page.goto('dashboard?panel=results');
    await page.getByRole('combobox', { name: 'القسم', exact: true }).locator('..').click();
    await selectOption(page, title, { exact: true });
    const row = page.locator('.results-entry').filter({ hasText: loginId });
    const eye = row.getByRole('button', { name: `عرض إجابة ${name}`, exact: true });
    await expect(eye).toBeVisible();
    await expect(eye).toBeEnabled();
    await expect(eye.locator('svg path')).toBeVisible();
    await expect(row).not.toContainText(title);
    await expect(row.locator('.results-entry__score-pill')).toHaveCount(0);
    const geometry = await eye.boundingBox();
    const card = await row.boundingBox();
    expect(geometry.width).toBeGreaterThanOrEqual(44);
    expect(geometry.height).toBeGreaterThanOrEqual(44);
    expect(geometry.x).toBeGreaterThanOrEqual(card.x);
    expect(geometry.x + geometry.width).toBeLessThanOrEqual(card.x + card.width);
    expect(geometry.y).toBeGreaterThanOrEqual(card.y);
    expect(geometry.y + geometry.height).toBeLessThanOrEqual(card.y + card.height);
    expect(geometry.x).toBeGreaterThanOrEqual(0);
    expect(geometry.x + geometry.width).toBeLessThanOrEqual(page.viewportSize().width);
    const identity = await row.locator('.results-entry__identity').boundingBox();
    expect(Math.min(geometry.y + geometry.height, identity.y + identity.height)).toBeGreaterThan(Math.max(geometry.y, identity.y));
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath(`${mode}-results-eye.png`), fullPage: true });
    if (info.project.use.hasTouch) await eye.tap();
    else await eye.click();
    const dialog = page.getByRole('dialog').filter({ has: page.locator('.results-answer-card') });
    await expect(dialog.getByRole('button', { name: 'تحميل PDF' })).toHaveCount(0);
    await expectDialogContained(dialog);
    await expect(dialog.locator(mode === 'document' ? '.rich-text-document-view' : '.results-answer-card__line--student')).toContainText(answer);
    await dialog.getByLabel('درجة الإجابة', { exact: true }).fill('4');
    const scored = page.waitForResponse(response => response.url().includes('/answers/') && response.url().endsWith('/manual-score') && response.request().method() === 'PUT');
    await dialog.getByRole('button', { name: 'حفظ الدرجة', exact: true }).click();
    expect((await scored).ok()).toBeTruthy();
    await expect(page.getByText('تم حفظ درجة الإجابة', { exact: true })).toBeVisible();
    await expect(dialog.getByLabel('درجة الإجابة', { exact: true })).toHaveValue('4');
    await page.reload();
    await page.getByRole('combobox', { name: 'القسم', exact: true }).locator('..').click();
    await selectOption(page, title, { exact: true });
    await eye.click();
    await expect(dialog.getByLabel('درجة الإجابة', { exact: true })).toHaveValue('4');
    await expect(dialog.locator('.results-answer-card')).toContainText(answer);
    if (mode === 'document') await expect(dialog.locator('.rich-text-document-view strong')).toContainText(answer);
    await expectDialogContained(dialog);
    if (mode === 'document') await expect(dialog.locator('.results-answer-card__question')).toHaveCount(0);
    await page.screenshot({ path: info.outputPath(`${mode}-saved-answer.png`) });
    await dialog.getByRole('button', { name: 'إغلاق', exact: true }).click();
    await expect(dialog).toBeHidden();
    expect(errors).toEqual([]);
  });
}
