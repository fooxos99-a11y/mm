import { expect, test } from './support/isolatedTest.mjs';
import { selectOption } from './support/gesture-helpers.mjs';
import { expectDialogContained } from './support/dialogGeometry.mjs';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

test('Word answers render as complete PDF pages with image recovery, download and cleanup', async ({ page, context }, info) => {
  test.setTimeout(180_000);
  await page.addInitScript(() => {
    window.revokedDocumentUrls = [];
    const revoke = URL.revokeObjectURL;
    URL.revokeObjectURL = url => { window.revokedDocumentUrls.push(url); revoke.call(URL, url); };
  });
  const loginId = `word-pdf-${info.project.name}`;
  const studentName = 'معلم معاينة المستند';
  const question = { id: 'word-question', prompt: 'السؤال الأصلي خارج إجابة المعلم', type: 'text', points: 10, correctAnswer: '' };
  const course = { id: 'word-task', title: 'نتيجة مهمة وورد', entityType: 'task', taskMode: 'document', taskPoints: 10, taskQuestions: [question], isTasksEnabled: true };
  const imageUrl = 'https://documents.example.test/student-answer.png';
  const html = `<h2 class="ql-align-center">إجابتي في المهمة الأدائية</h2>
    <p><strong>المعلم: ${studentName}</strong></p>
    <img src="${imageUrl}" style="width:80px;height:80px">
    <table style="width:100%;border-collapse:collapse"><tr><td style="border:1px solid #17394b">المهارة</td><td style="border:1px solid #17394b">التطبيق</td></tr><tr><td style="border:1px solid #17394b">التعاون</td><td style="border:1px solid #17394b">أنجزت النشاط مع زملائي</td></tr></table>
    ${Array.from({ length: 44 }, (_, i) => `<p>إجابة ${i + 1}: طبّقت المهارة في الدرس، وناقشت النتائج مع زملائي.</p>`).join('')}
    <p><strong>نهاية إجابة المعلم - تمّت مراجعة المستند كاملًا.</strong></p>`;
  const snapshot = { branches: [{ id: 'male', name: 'معلمين' }, { id: 'female', name: 'معلمات' }],
    courses: [course], students: [{ id: 'word-student', name: studentName, loginId, branchId: 'male' }],
    submissions: [{ id: 'word-submission', courseId: course.id, assessmentType: 'tasks', studentName, loginId, submittedAt: '2026-10-20T00:00:00Z',
      answers: [{ id: 'word-answer', questionId: question.id, value: html, requiresManualReview: true }] }],
    attendance: [], finalExamQuestions: [], finalExamSubmissions: [], reciters: [], notifications: [], rolePermissions: {},
    pagination: { total: 1, page: 1, pages: 1, perPage: 20 } };
  let user = { id: 'word-admin', name: 'مسؤول المعاينة', loginCode: 'word-admin', role: 'admin', systemRole: 'admin', mustChangePassword: false };
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url());
    const endpoint = url.pathname.slice(url.pathname.indexOf('/api') + 4);
    const fulfill = body => route.fulfill({ json: body });
    if (endpoint === '/auth/session') return fulfill({ user });
    if (endpoint === '/dashboard/results/catalog') return fulfill([course]);
    if (endpoint === '/dashboard/shell') return fulfill({ ...snapshot, snapshotMode: 'shell' });
    if (endpoint.endsWith('/snapshot') || endpoint === '/dashboard/results') return fulfill(snapshot);
    return fulfill({});
  });
  const image = readFileSync(new URL('../public/الأيقونة.png', import.meta.url));
  let failImage = true;
  await page.route(imageUrl, route => failImage ? route.abort('failed') : route.fulfill({ body: image, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' } }));
  await page.goto('dashboard?panel=results');
  await page.getByRole('combobox', { name: 'القسم', exact: true }).locator('..').click();
  await selectOption(page, course.title, { exact: true });
  await page.locator('.results-entry').filter({ hasText: loginId }).getByRole('button', { name: /عرض إجابة/ }).click();
  const dialog = page.getByRole('dialog', { name: 'الإجابة', exact: true });
  await expect(dialog.getByRole('alert')).toContainText('تعذّر تجهيز PDF', { timeout: 60000 });
  await expect(dialog.getByRole('link', { name: 'تحميل PDF', exact: true })).toHaveCount(0);
  await expect(dialog.getByText('السؤال الأصلي خارج إجابة المعلم', { exact: false })).toHaveCount(0);
  await dialog.getByText('عرض المستند الأصلي', { exact: true }).click();
  await expect(dialog.getByText('نهاية إجابة المعلم - تمّت مراجعة المستند كاملًا.', { exact: true })).toBeVisible();
  failImage = false;
  await dialog.getByRole('button', { name: 'إعادة المحاولة', exact: true }).click();
  const downloadLink = dialog.getByRole('link', { name: 'تحميل PDF', exact: true });
  await expect(downloadLink).toBeVisible({ timeout: 60000 });
  await expect(dialog.locator('.document-answer-preview__text')).toContainText('نهاية إجابة المعلم');
  await expect(dialog.getByRole('alert')).toHaveCount(0);
  const pages = dialog.locator('.document-answer-preview__pages figure');
  expect(await pages.count()).toBeGreaterThanOrEqual(2);
  await expect.poll(() => pages.first().locator('img').evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
  await expectDialogContained(dialog);
  await expect(dialog.getByRole('button', { name: /تكبير المستند|تصغير المستند/ })).toHaveCount(0);
  const directory = path.resolve('../.deploy/word-pdf');
  mkdirSync(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, `${info.project.name}-preview.png`), fullPage: true });
  const download = page.waitForEvent('download');
  await downloadLink.click();
  const file = await download;
  expect(file.suggestedFilename()).toContain(studentName);
  const target = path.join(directory, `${info.project.name}-answer.pdf`);
  await file.saveAs(target);
  const bytes = readFileSync(target);
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  expect((bytes.toString('latin1').match(/\/Type \/Page\b/g) || []).length).toBe(await pages.count());
  const pdfUrl = await downloadLink.getAttribute('href');
  await dialog.getByRole('button', { name: 'إغلاق', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.document-answer-preview')).toHaveCount(0);
  expect(await page.evaluate(url => window.revokedDocumentUrls.includes(url), pdfUrl)).toBe(true);
  await page.goto('about:blank');
  await context.clearCookies();
  user = { id: 'word-user', name: studentName, loginCode: loginId, role: 'student', systemRole: 'student', mustChangePassword: false };
  await page.goto('student');
  if (page.viewportSize().width <= 1024) await page.getByRole('button', { name: 'فتح القائمة', exact: true }).click();
  await page.getByRole('button', { name: 'المهام الأدائية', exact: true }).click();
  await page.getByRole('combobox', { name: 'المهام الأدائية', exact: true }).locator('..').click();
  await selectOption(page, course.title, { exact: true });
  await page.getByRole('button', { name: 'عرض التفاصيل', exact: true }).click();
  await expect(page.getByRole('link', { name: 'تحميل PDF', exact: true })).toBeVisible({ timeout: 60000 });
  await expect(page.getByRole('region', { name: 'إجابتك بصيغة PDF', exact: true })).toBeVisible();
  expect(await page.locator('.document-answer-preview__pages figure').count()).toBeGreaterThanOrEqual(2);
});
