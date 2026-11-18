import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './support/isolatedTest.mjs';
import { login, selectOption } from './support/gesture-helpers.mjs';
import { studentPassword } from './support/credentials.mjs';
import { expectDialogContained } from './support/dialogGeometry.mjs';

test('named survey responses preserve previous ratings, comments and removed questions across search, pages and reload', async ({ page, context }, info) => {
  test.setTimeout(180_000);
  await login(page);
  const origin = new URL(process.env.VUE_APP_API_BASE_URL).origin;
  const api = async (method, path, data) => {
    const csrf = (await context.cookies(origin)).find(cookie => cookie.name === 'XSRF-TOKEN');
    const response = await page.request.fetch(`${origin}/api${path}`, {
      method, headers: { Referer: page.url(), 'X-XSRF-TOKEN': decodeURIComponent(csrf?.value || '') }, data,
    });
    expect(response.ok(), `${method} ${path}: ${await response.text()}`).toBeTruthy();
    return response.status() === 204 ? null : response.json();
  };
  const course = await api('POST', '/dashboard/courses', { title: 'استبيان الإجابات السابقة', isActive: false });
  const other = await api('POST', '/dashboard/courses', { title: 'استبيان دورة أخرى', isActive: false });
  const empty = await api('POST', '/dashboard/courses', { title: 'استبيان دون مشاركين', isActive: false });
  const question = async (courseId, prompt, type) => (await api('POST', '/dashboard/satisfaction-questions', {
    courseId, prompt, type, targetScope: 'course', isRequired: false,
  }))[0].id;
  const rating = await question(course.id, 'تقييم الدورة', 'rating');
  const comment = await question(course.id, 'ملاحظاتك على الدورة', 'text');
  const previous = await question(course.id, 'سؤال سابق حُذف بعد الإجابة', 'rating');
  const otherQuestion = await question(other.id, 'تقييم الدورة الأخرى', 'rating');
  for (const [branchId, loginId] of [['male', 'survey6101'], ['female', 'survey6102']]) {
    await api('POST', '/students', { name: 'محمد عبد الله', loginId, branchId,
      password: studentPassword, passwordConfirmation: studentPassword });
  }
  const maleText = 'إجابة نصية محفوظة\nالسطر الثاني <img src=x onerror="window.surveyInjected=true">';
  const longName = `مشارك قديم 21 ${'اسمطويلمتصل'.repeat(12)}`;
  const answer = (questionId, loginCode, studentName, ratingValue, textValue = '', courseId = course.id) => ({
    courseId, questionId, loginCode, studentName, ratingValue, textValue,
  });
  await api('POST', '/dashboard/satisfaction-responses', { responses: [
    answer(rating, 'survey6101', 'الاسم وقت الإجابة', 8, 'تعليق محفوظ مع التقييم'),
    answer(comment, 'survey6101', 'الاسم وقت الإجابة', null, maleText),
    answer(previous, 'survey6101', 'الاسم وقت الإجابة', 6, 'رد على سؤال سابق'),
    answer(rating, 'survey6102', 'محمد عبد الله', 3),
    answer(comment, 'survey6102', 'محمد عبد الله', null, 'إجابة المجيبة الأخرى'),
    answer(otherQuestion, 'other-course', 'مجيب الدورة الأخرى', 10, '', other.id),
    ...Array.from({ length: 21 }, (_, index) => answer(rating, `legacy${index}`, index === 20 ? longName : `مشارك قديم ${String(index + 1).padStart(2, '0')}`, 5)),
  ] });
  await api('DELETE', `/dashboard/satisfaction-questions/${previous}`);
  const savedResponses = (await api('GET', '/dashboard/snapshot')).satisfactionResponses;
  const openCourse = async title => {
    await page.locator('.satisfaction-admin__select .v-field').click();
    await selectOption(page, title, { exact: true });
  };
  await page.goto('dashboard?panel=satisfaction');
  await openCourse(course.title);
  const panel = page.locator('.satisfaction-responses');
  await expect(panel).toContainText('عدد المشاركين: 23');
  await expect(panel.getByText('مجيب الدورة الأخرى', { exact: true })).toHaveCount(0);
  await expect(panel.locator('li')).toHaveCount(20);
  await panel.getByRole('button', { name: 'الصفحة التالية', exact: true }).click();
  await expect(panel.locator('li')).toHaveCount(3);
  const search = panel.getByRole('textbox', { name: 'البحث بالاسم أو رقم الدخول', exact: true });
  await search.fill('legacy20');
  await expect(panel.getByText(longName, { exact: true })).toBeVisible();
  await panel.getByRole('button', { name: /^عرض إجابات/ }).click();
  const longDialog = page.getByRole('dialog', { name: 'إجابات الاستبيان', exact: true });
  await expectDialogContained(longDialog);
  expect(await longDialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await longDialog.locator('.app-dialog-footer').getByRole('button', { name: 'إغلاق', exact: true }).click();
  await search.fill('غير موجود');
  await expect(panel.getByRole('status')).toHaveText('لا توجد أسماء أو أرقام دخول تطابق بحثك.');
  await search.fill('٦١٠١');
  await expect(panel.locator('li')).toHaveCount(1);
  await panel.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('named-survey-list.png') });
  const maleButton = panel.getByRole('button', { name: 'عرض إجابات محمد عبد الله، رقم الدخول survey6101', exact: true });
  await maleButton.click();
  const dialog = page.getByRole('dialog', { name: 'إجابات الاستبيان', exact: true });
  await expect(dialog.getByText('8 / 10', { exact: true })).toBeVisible();
  await expect(dialog.getByText('6 / 10', { exact: true })).toBeVisible();
  await expect(dialog.getByText('تعليق محفوظ مع التقييم', { exact: true })).toBeVisible();
  await expect(dialog.getByText(maleText, { exact: true })).toBeVisible();
  await expect(dialog.getByText('سؤال سابق حُذف بعد الإجابة', { exact: true })).toBeVisible();
  await expect(dialog.locator('.satisfaction-responses__answers img')).toHaveCount(0);
  expect(await page.evaluate(() => Boolean(window.surveyInjected))).toBe(false);
  await expectDialogContained(dialog);
  const accessibility = await new AxeBuilder({ page }).include('.satisfaction-responses').analyze();
  expect(accessibility.violations.filter(({ impact }) => ['critical', 'serious'].includes(impact))).toEqual([]);
  await page.screenshot({ path: info.outputPath('named-survey-response.png') });
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(maleButton).toBeFocused();
  await search.fill('6102');
  await panel.getByRole('button', { name: 'عرض إجابات محمد عبد الله، رقم الدخول survey6102', exact: true }).click();
  await expect(dialog.getByText('3 / 10', { exact: true })).toBeVisible();
  await expect(dialog.getByText('إجابة المجيبة الأخرى', { exact: true })).toBeVisible();
  await expect(dialog.getByText(maleText, { exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await openCourse(other.title);
  await expect(search).toHaveValue('');
  await expect(panel).toContainText('عدد المشاركين: 1');
  await expect(panel.getByText('مجيب الدورة الأخرى', { exact: true })).toBeVisible();
  await openCourse(empty.title);
  await expect(panel.getByRole('status')).toHaveText('لم تصل إجابات لهذه الدورة بعد.');
  await page.reload();
  await openCourse(course.title);
  await search.fill('6101');
  await maleButton.click();
  await expect(dialog.getByText(maleText, { exact: true })).toBeVisible();
  await expect(dialog.getByText('سؤال سابق حُذف بعد الإجابة', { exact: true })).toBeVisible();
  expect((await api('GET', '/dashboard/snapshot')).satisfactionResponses).toEqual(savedResponses);
});

test('survey page permission allows read-only response viewing without granting question editing', async ({ page }) => {
  const user = { id: 'manager', role: 'male_manager', systemRole: 'male_manager', name: 'مشرف', loginCode: 'manager', mustChangePassword: false };
  const snapshot = { students: [], courses: [{ id: 'course', title: 'دورة', entityType: 'course' }], branches: [],
    satisfactionQuestions: [], satisfactionResponses: [{ id: 'private', courseId: 'course', loginCode: 'private', studentName: 'اسم لا يظهر', textValue: 'إجابة خاصة' }],
    attendance: [], submissions: [], reciters: [], notifications: [], finalExamQuestions: [], finalExamSubmissions: [],
    rolePermissions: { male_manager: { page_overview: true, page_satisfaction: false } } };
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/session')) return route.fulfill({ json: { user } });
    return route.fulfill({ json: { ...snapshot, ...(path.endsWith('/dashboard/shell') ? { snapshotMode: 'shell' } : {}) } });
  });
  await page.goto('dashboard?panel=satisfaction');
  await expect(page.locator('.dashboard-topbar')).toBeVisible();
  await expect(page.locator('.satisfaction-responses')).toHaveCount(0);
  await expect(page.getByText('اسم لا يظهر', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'استبيان الرضا', exact: true })).toHaveCount(0);
  snapshot.rolePermissions.male_manager.page_satisfaction = true;
  await page.goto('dashboard?panel=satisfaction');
  await expect(page.locator('.satisfaction-responses').getByText('اسم لا يظهر', { exact: true })).toBeVisible();
  await expect(page.locator('.satisfaction-admin__delete-indicator')).toHaveCount(0);
  await page.locator('.satisfaction-responses').getByRole('button', { name: /^عرض إجابات/ }).click();
  const dialog = page.getByRole('dialog', { name: 'إجابات الاستبيان', exact: true });
  await expect(dialog.getByText('إجابة خاصة', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('textbox')).toHaveCount(0);
});
