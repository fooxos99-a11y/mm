import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';
import { expect, test } from './support/isolatedTest.mjs';
import { login, selectOption } from './support/gesture-helpers.mjs';
import { studentPassword } from './support/credentials.mjs';

const createApi = async (page, context) => {
  const origin = new URL(process.env.VUE_APP_API_BASE_URL).origin;
  const token = (await context.cookies(origin)).find(cookie => cookie.name === 'XSRF-TOKEN');
  return async (method, route, data) => {
    const response = await page.request.fetch(`${origin}/api${route}`, {
      method, data, headers: { Referer: page.url(), 'X-XSRF-TOKEN': decodeURIComponent(token.value), Accept: 'application/json' },
    });
    expect(response.ok(), `${method} ${route}: ${response.status()}`).toBeTruthy();
    return response.status() === 204 ? null : response.json();
  };
};
const checkCountdownReturn = async (page, info, panelName, name) => {
  const navigate = async label => {
    const menu = page.getByRole('button', { name: 'فتح القائمة', exact: true });
    if (await menu.isVisible()) await menu.click();
    await page.getByRole('navigation').getByRole('button', { name: label, exact: true }).click();
  };
  await navigate('الإشعارات');
  await expect(page.locator('.communications-page')).toBeVisible();
  await expect(page.getByRole('timer')).toHaveCount(0);
  await navigate(panelName);
  const controls = page.locator('.dashboard-topbar__assessment-controls');
  const timer = controls.locator('.dashboard-topbar__timer-label').first();
  await expect(timer).toBeVisible();
  const tick = await timer.textContent();
  await expect(timer).not.toHaveText(tick);
  const timers = await controls.locator('.dashboard-topbar__timer-list').boundingBox();
  const action = await controls.locator('.dashboard-topbar__actions button').first().boundingBox();
  expect(Math.min(timers.y + timers.height, action.y + action.height)).toBeGreaterThan(Math.max(timers.y, action.y));
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: info.outputPath(`${name}-navigation-countdown.png`), fullPage: false });
};
const select = async (page, id, label, auditName = '') => {
  await expect(page.locator(`#${id}`)).toBeEnabled();
  await page.locator(`#${id}`).locator('xpath=ancestor::div[contains(@class,"v-input")]').locator('.v-field').click();
  if (auditName) {
    await expect(page.getByRole('listbox', { name: auditName, exact: true })).toBeVisible();
    await expect(page.locator('.Vue-Toastification__toast')).toHaveCount(0);
    await expect.poll(() => page.locator('.app-dropdown-menu').filter({ visible: true }).evaluate(element =>
      element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length,
    )).toBe(0);
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(audit.violations).toEqual([]);
    const owner = page.getByRole('dialog').filter({ visible: true });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('listbox', { name: auditName, exact: true })).toBeHidden();
    await expect(owner).toBeVisible();
    await page.locator(`#${id}`).locator('xpath=ancestor::div[contains(@class,"v-input")]').locator('.v-field').click();
  }
  await selectOption(page, label);
  await expect(page.locator('.app-dropdown-menu').filter({ visible: true })).toHaveCount(0);
};
const inspect = async (page, info, name) => {
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.Vue-Toastification__toast')).toHaveCount(0);
  expect(await page.locator('html').getAttribute('dir')).toBe('rtl');
  const geometry = await page.locator('.assessment-page').evaluate(root => ({
    width: document.documentElement.scrollWidth, viewport: window.innerWidth,
    clippedTextareas: [...root.querySelectorAll('textarea')].filter(input => input.scrollHeight > input.clientHeight + 1).map(input => input.id),
    outsideControls: [...root.querySelectorAll('button, input, textarea, select')].filter(element => {
      const box = element.getBoundingClientRect();
      const container = root.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && (box.left < container.left - 1 || box.right > container.right + 1);
    }).map(element => element.id || element.getAttribute('aria-label') || element.textContent.trim()),
    smallTargets: [...root.querySelectorAll('button:not(:disabled), .v-field, select, summary')].filter(element => {
      const box = element.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && (box.width < 44 || box.height < 44);
    }).map(element => ({ label: element.getAttribute('aria-label') || element.textContent.trim(), width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })),
  }));
  expect(geometry.width).toBeLessThanOrEqual(geometry.viewport + 1);
  expect(geometry.clippedTextareas).toEqual([]);
  expect(geometry.outsideControls).toEqual([]);
  expect(geometry.smallTargets).toEqual([]);
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
  const accessibilityPath = info.outputPath(`${name}-accessibility.json`);
  await writeFile(accessibilityPath, JSON.stringify(axe.violations.map(({ id, impact, nodes }) => ({ id, impact, elements: nodes.map(node => node.target) })), null, 2));
  await info.attach(`${name}-accessibility`, { path: accessibilityPath, contentType: 'application/json' });
  expect(axe.violations).toEqual([]);
  await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: false });
};

test('task and final exam opening use hours and preserve actual deadlines', async ({ page, context }, info) => {
  await login(page);
  const api = await createApi(page, context);
  const task = await api('POST', '/dashboard/courses', {
    title: 'مهمة التحقق من المدة بالساعات', entityType: 'task', taskMode: 'document', isActive: false,
  });
  await page.goto('dashboard?panel=tasks');
  await select(page, 'assessment-toolbar-course', task.title);
  const header = page.locator('.dashboard-topbar');
  await expect(header.locator('.dashboard-topbar__label')).toHaveText('مرحبًا');
  await header.getByRole('button', { name: 'بدء المهمة الأدائية', exact: true }).click();
  const taskDialog = page.getByRole('dialog', { name: 'فتح المهام الأدائية', exact: true });
  const taskHours = taskDialog.getByRole('spinbutton', { name: 'مدة الفتح بالساعات' });
  await expect(taskHours).toHaveValue('1');
  await taskHours.fill('0.5');
  await page.screenshot({ path: info.outputPath('task-hours.png'), fullPage: false });
  await taskDialog.getByRole('button', { name: 'فتح الاختبار', exact: true }).click();
  await expect(taskDialog).toBeHidden();
  const timer = header.locator('.dashboard-topbar__timer-label').first();
  await expect(timer).toHaveText(/^29:\d{2}$/);
  const taskTick = await timer.textContent();
  await expect(timer).not.toHaveText(taskTick);
  const stored = (await api('GET', '/dashboard/snapshot')).courses.find(item => item.id === task.id);
  const window = stored.assessmentWindows.male.tasks;
  expect(window.durationMinutes).toBe(30);
  expect(new Date(window.closesAt) - new Date(window.opensAt)).toBe(30 * 60000);
  await checkCountdownReturn(page, info, 'المهام الأدائية', 'task');
  await expect(header.getByRole('button', { name: 'إدارة المهمة الأدائية', exact: true })).toBeVisible();
  await page.reload();
  await select(page, 'assessment-toolbar-course', task.title);
  await expect(header.getByRole('button', { name: 'إدارة المهمة الأدائية', exact: true })).toBeVisible();
  await expect(timer).toBeVisible();
  for (const branch of ['male', 'female']) await api('PUT', `/dashboard/final-exam/settings/${branch}`, { isEnabled: false, closesAt: null });
  await page.goto('dashboard?panel=finalexam');
  await header.getByRole('button', { name: 'بدء', exact: true }).click();
  const finalDialog = page.getByRole('dialog', { name: 'فتح الاختبار النهائي', exact: true });
  const finalHours = finalDialog.getByRole('spinbutton', { name: 'مدة الفتح بالساعات' });
  await expect(finalHours).toHaveValue('1');
  for (const invalid of ['', '0', '-1']) {
    await finalHours.fill(invalid);
    await finalDialog.getByRole('button', { name: 'بدء', exact: true }).click();
    await expect(finalDialog.getByRole('alert')).toHaveText('أدخل مدة فتح صحيحة بالساعات');
    expect((await api('GET', '/dashboard/snapshot')).finalExamSettings.male.isEnabled).toBe(false);
  }
  await finalHours.fill('1.5');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: info.outputPath('final-hours.png'), fullPage: false });
  const before = Date.now();
  await finalDialog.getByRole('button', { name: 'بدء', exact: true }).click();
  await expect(finalDialog).toBeHidden();
  await expect(timer).toHaveText(/^01:29:\d{2}$/);
  const finalTick = await timer.textContent();
  await expect(timer).not.toHaveText(finalTick);
  const setting = (await api('GET', '/dashboard/snapshot')).finalExamSettings.male;
  expect(setting.isEnabled).toBe(true);
  // The API accepts local date/time strings; compare in the browser's local timezone.
  const deadline = await page.evaluate(value => new Date(value).getTime(), setting.closesAt);
  expect(deadline - before).toBeGreaterThan(89 * 60000);
  expect(deadline - before).toBeLessThan(91 * 60000);
  await checkCountdownReturn(page, info, 'الاختبار النهائي', 'final');
  await page.reload();
  await expect(header.getByRole('button', { name: 'إيقاف الاختبار', exact: true })).toBeVisible();
  await expect(timer).toBeVisible();
});

test('initial loading shows the shared navigation icon without platform copy', async ({ page }, info) => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  await page.route(/\/assets\/index-[^/]+\.js$/, async route => { await pending; await route.continue(); });
  const navigation = page.goto('login', { waitUntil: 'domcontentloaded' });
  try {
    const loading = page.getByRole('status', { name: 'جارٍ التحميل', exact: true });
    await expect(loading).toBeVisible();
    await expect(loading).toHaveText('');
    await expect.poll(() => loading.locator('.app-loading-indicator').evaluate(element => getComputedStyle(element, '::after').animationName)).toBe('app-loader-spin');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width);
    await page.screenshot({ path: info.outputPath('initial-loading.png') });
  } finally { release(); }
  await navigation;
  await expect(page.getByRole('textbox', { name: 'رقم الدخول', exact: true })).toBeVisible();
  await expect(page.locator('.app-boot')).toHaveCount(0);
});

test('independent audit: forty questions and thirty long-name teachers preserve keyboard editing, scores and attendance after reload', async ({ page, context }, info) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await login(page);
  const api = await createApi(page, context);
  const course = await api('POST', '/dashboard/courses', { title: 'دورة مراجعة جودة الواجهات والتحقق من الأسماء الطويلة والمتجاوبة', isActive: false });
  const questions = [];
  for (let index = 0; index < 40; index += 1) {
    questions.push(await api('POST', `/dashboard/courses/${course.id}/questions`, {
      assessmentType: 'pre', prompt: `السؤال ${index + 1}: ${'بيّن حكم التجويد مع توضيح السبب والأمثلة. '.repeat(3)}`,
      type: 'multiple', points: 2, options: ['الإجابة الصحيحة مع تعليل مطوّل واضح', 'إجابة أخرى'], correctAnswer: 'الإجابة الصحيحة مع تعليل مطوّل واضح', allowFile: false,
    }));
  }
  for (let index = 0; index < 30; index += 1) {
    await api('POST', '/students', { name: `معلم المراجعة ${index + 1} ${'ذو الاسم العربي الطويل لاختبار الالتفاف '.repeat(2)}`, loginId: `97${String(index).padStart(5, '0')}`, branchId: 'male', password: studentPassword, passwordConfirmation: studentPassword });
  }
  const roster = (await api('GET', '/dashboard/snapshot')).students.filter(student => student.branchId === 'male');
  await page.goto(`dashboard?panel=courses&courseId=${course.id}`);
  await expect(page.locator('.assessment-attendance__row')).toHaveCount(roster.length);
  const fields = page.locator('.assessment-toolbar .app-filter-field');
  if (page.viewportSize().width >= 360) {
    const first = await fields.nth(0).boundingBox();
    const second = await fields.nth(1).boundingBox();
    expect(Math.abs(first.y + first.height - second.y - second.height)).toBeLessThanOrEqual(1);
    expect(Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y)).toBeGreaterThan(0);
  }
  await expect(page.locator('.dashboard-topbar')).toBeVisible();
  await expect(page.locator('.dashboard-topbar')).toHaveText('');
  await expect(page.getByRole('searchbox', { name: 'البحث بالاسم أو رقم الدخول', exact: true })).toHaveCount(0);
  await expect(page.getByText('المحضّرون:', { exact: false })).toHaveCount(0);
  await expect(page.locator('.assessment-attendance__login')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'حفظ التحضير', exact: true })).toHaveCount(0);
  const everyone = page.getByRole('button', { name: 'تحديد حضور الجميع', exact: true });
  await everyone.focus();
  const attendanceSaved = page.waitForResponse(response => response.url().endsWith('/dashboard/manual-attendance') && response.request().method() === 'POST');
  await page.keyboard.press('Enter');
  expect((await attendanceSaved).status()).toBe(204);
  await expect(page.locator('.assessment-attendance__footer')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.attendance-toggle[aria-pressed=true]')).toHaveCount(roster.length);
  await inspect(page, info, 'bulk-attendance');
  await select(page, 'assessment-toolbar-mode', 'الاختبار القبلي');
  await expect(page.locator('.assessment-inline-list__item')).toHaveCount(40);
  expect(await page.locator('.assessment-editor-question input[type=number]').evaluateAll(inputs => inputs.reduce((sum, input) => sum + Number(input.value), 0))).toBe(80);
  const last = page.locator(`#assessment-question-${questions[39].id}-prompt`);
  await page.getByRole('combobox', { name: 'الانتقال إلى سؤال', exact: true }).selectOption(await last.getAttribute('id'));
  await expect(last).toBeFocused();
  const focus = await last.evaluate(input => {
    const control = input.closest('.app-field__control');
    return { shadow: getComputedStyle(control).boxShadow, border: getComputedStyle(control).borderColor };
  });
  expect(focus.shadow).not.toBe('none');
  await last.fill('نص محرّر من لوحة المفاتيح للسؤال الأربعين');
  await last.click();
  const warning = page.waitForEvent('dialog');
  const reload = page.reload({ timeout: 3000 }).catch(error => {
    expect(error.message).toMatch(/ERR_ABORTED|Timeout/);
  });
  const dialog = await warning;
  expect(dialog.type()).toBe('beforeunload');
  await dialog.dismiss();
  await reload;
  await expect(last).toHaveValue('نص محرّر من لوحة المفاتيح للسؤال الأربعين');
  const lastCard = last.locator('xpath=ancestor::article[1]');
  const answer = lastCard.getByRole('button', { name: 'تحديد الخيار 2 إجابة صحيحة', exact: true });
  await answer.focus();
  await page.keyboard.press('Space');
  await expect(answer).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'حذف السؤال 1', exact: true }).click();
  const saved = page.waitForResponse(response => response.url().endsWith(`/courses/${course.id}/questions/sync`) && response.request().method() === 'PUT');
  await page.getByRole('button', { name: 'حفظ الأسئلة', exact: true }).click();
  expect((await saved).status()).toBe(200);
  await expect(page.locator('.assessment-editor-header__dirty')).toHaveCount(0);
  await expect(page.locator('.assessment-inline-list__item')).toHaveCount(39);
  expect(await page.locator('.assessment-editor-question input[type=number]').evaluateAll(inputs => inputs.reduce((sum, input) => sum + Number(input.value), 0))).toBe(78);
  await page.reload();
  await select(page, 'assessment-toolbar-mode', 'الاختبار القبلي');
  await expect(last).toHaveValue('نص محرّر من لوحة المفاتيح للسؤال الأربعين');
  const persisted = (await api('GET', '/dashboard/snapshot')).courses.find(item => item.id === course.id).preQuestions;
  expect(persisted).toHaveLength(39);
  expect(persisted.find(question => question.id === questions[39].id).correctAnswer).toBe('إجابة أخرى');
  expect(persisted.reduce((sum, question) => sum + question.points, 0)).toBe(78);
  await inspect(page, info, 'bulk-editor');
  await last.locator('xpath=ancestor::article[1]').screenshot({ path: info.outputPath('compact-question-options.png') });
  await select(page, 'assessment-toolbar-mode', 'المؤشرات');
  await expect(page.locator('.assessment-indicator')).toHaveCount(2);
  await expect(page.locator('.assessment-indicators progress')).toHaveCount(0);
  await expect(page.locator('.assessment-indicators__warning')).toContainText('النتائج غير مكتملة');
  await inspect(page, info, 'empty-indicators');
  expect(errors).toEqual([]);
});

test('independent audit: loading, snapshot failure, recovery and an empty branch show explicit states', async ({ page, context }, info) => {
  await login(page);
  const api = await createApi(page, context);
  const course = await api('POST', '/dashboard/courses', { title: 'حالات التحميل والخطأ والفراغ', isActive: false });
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  await page.route('**/dashboard/snapshot**', async route => {
    await pending;
    await route.fulfill({ status: 503, json: { message: 'تعذّر تحميل بيانات الاختبار مؤقتًا' } });
  });
  try {
    await page.goto(`dashboard?panel=courses&courseId=${course.id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('status', { name: 'جارٍ تحميل لوحة التحكم', exact: true })).toBeVisible();
  } finally { release(); }
  await expect(page.locator('.dashboard-error[role=alert]')).toContainText('تعذّر تحميل بيانات الاختبار مؤقتًا');
  await expect(page.locator('.dashboard-loader-shell')).toHaveCount(0);
  await page.unroute('**/dashboard/snapshot**');
  const snapshot = await api('GET', '/dashboard/snapshot');
  for (const student of snapshot.students.filter(item => item.branchId === 'female')) await api('DELETE', `/students/${student.id}`);
  await page.reload();
  await expect(page.locator('.assessment-attendance__row')).toHaveCount(snapshot.students.filter(item => item.branchId === 'male').length);
  for (const [id, name] of [['assessment-toolbar-course', 'الدورات'], ['assessment-toolbar-mode', 'النوع'], ['assessment-attendance-branch', 'الفرع']]) {
    await page.locator(`#${id}`).press('ArrowDown');
    const menuRole = id === 'assessment-toolbar-course' ? 'grid' : 'listbox';
    await expect(page.getByRole(menuRole, { name, exact: true })).toBeVisible();
    await expect.poll(() => page.locator('.app-dropdown-menu').filter({ visible: true }).evaluate(element =>
      element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length,
    )).toBe(0);
    if (id === 'assessment-toolbar-course') {
      const management = page.getByRole('row', { name: course.title, exact: true }).locator('.app-select-action-row__actions');
      const action = management.getByRole('button').first();
      const trash = management.getByRole('button', { name: /حذف/ });
      await expect.poll(() => trash.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
      expect(await trash.locator('.v-icon').evaluate(el => getComputedStyle(el).color)).toBe('rgb(209, 67, 67)');
      await expect(page.getByText('إدارة الدورات', { exact: true })).toHaveCount(0);
      await expect.poll(async () => Math.round((await action.boundingBox()).height)).toBeGreaterThanOrEqual(44);
      await expect(page.getByRole('row', { name: course.title, exact: true })).toBeFocused();
      await page.getByRole('row', { name: course.title, exact: true }).press('Tab');
      await expect(action).toBeFocused();
      expect(await action.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none');
      await action.press('Tab');
      await expect(management.getByRole('button').last()).toBeFocused();
      await management.getByRole('button').last().press('Shift+Tab');
      await expect(action).toBeFocused();
    }
    const menuAudit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(menuAudit.violations).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(page.getByRole(menuRole, { name, exact: true })).toBeHidden();
  }
  await select(page, 'assessment-attendance-branch', 'معلمات');
  await expect(page.getByRole('heading', { name: 'لا يوجد معلمون في هذا الفرع', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'حفظ التحضير', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'تحديد حضور الجميع', exact: true })).toBeDisabled();
  await select(page, 'assessment-toolbar-mode', 'المؤشرات');
  await select(page, 'assessment-indicators-branch', 'معلمات');
  await expect(page.getByRole('heading', { name: 'لا يوجد معلمون في الفرع المحدد', exact: true })).toBeVisible();
  await inspect(page, info, 'empty-branch');
});

test('compact task description, link and inline catalog actions preserve real values and keyboard access', async ({ page, context }, info) => {
  await login(page);
  const api = await createApi(page, context);
  const task = await api('POST', '/dashboard/courses', { title: 'مهمة بوصف عربي طويل للتأكد من وضوح الحقول والإجراءات', entityType: 'task', taskMode: 'document', isActive: false });
  await page.goto('dashboard?panel=tasks');
  await select(page, 'assessment-toolbar-course', task.title);
  const description = page.getByRole('textbox', { name: 'الوصف', exact: true });
  const link = page.getByRole('textbox', { name: 'الرابط', exact: true });
  expect((await description.boundingBox()).height).toBeGreaterThanOrEqual(120);
  await page.screenshot({ path: info.outputPath('task-description-initial.png'), fullPage: false });
  const text = 'وصف المهمة يتضمن تعليمات واضحة وأمثلة تفصيلية للمعلم. '.repeat(12);
  await description.fill(text);
  await link.fill('https://example.com/task-video');
  const box = await description.boundingBox();
  expect((await link.boundingBox()).y).toBeGreaterThan(box.y + box.height);
  expect(await description.evaluate(input => input.scrollHeight <= input.clientHeight + 1)).toBe(true);
  const saved = page.waitForResponse(response => response.url().endsWith(`/courses/${task.id}/questions/sync`) && response.request().method() === 'PUT');
  await page.getByRole('button', { name: 'حفظ', exact: true }).click();
  expect((await saved).status()).toBe(200);
  await page.reload();
  await select(page, 'assessment-toolbar-course', task.title);
  await expect(description).toHaveValue(text.trim());
  await expect(link).toHaveValue('https://example.com/task-video');
  await page.locator('#assessment-toolbar-course').press('ArrowDown');
  const grid = page.getByRole('grid', { name: 'المهام الأدائية', exact: true });
  await expect(grid).toBeVisible();
  const row = grid.getByRole('row', { name: task.title, exact: true });
  const edit = row.getByRole('button', { name: `تعديل اسم المهمة ${task.title}`, exact: true });
  const remove = row.getByRole('button', { name: `حذف المهمة ${task.title}`, exact: true });
  await expect(row).toBeFocused();
  await row.press('Tab');
  await expect(edit).toBeFocused();
  await edit.press('Tab');
  await expect(remove).toBeFocused();
  const menuAudit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(menuAudit.violations).toEqual([]);
  await page.screenshot({ path: info.outputPath('task-inline-menu.png'), fullPage: false });
  await edit.click();
  const dialog = page.getByRole('dialog', { name: 'تعديل اسم المهمة', exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'إلغاء', exact: true }).click();
  await page.keyboard.press('Escape');
  await inspect(page, info, 'task-description');
});

test('header actions open assessments, preserve the other branch on close and persist after reload', async ({ page, context }, info) => {
  await login(page);
  const api = await createApi(page, context);
  const course = await api('POST', '/dashboard/courses', { title: 'التحقق الفعلي من بدء الاختبار وإيقافه', isActive: false });
  for (const type of ['pre', 'post']) await api('POST', `/dashboard/courses/${course.id}/questions`, {
    assessmentType: type, prompt: 'سؤال للتحقق من فتح الاختبار', type: 'text', options: [], points: 2, correctAnswer: '', allowFile: false,
  });
  const storedCourse = async () => (await api('GET', '/dashboard/snapshot')).courses.find(item => item.id === course.id);
  await page.goto(`dashboard?panel=courses&courseId=${course.id}`);
  for (const [type, label, enabledKey] of [['pre', 'الاختبار القبلي', 'isPreEnabled'], ['post', 'الاختبار البعدي', 'isPostEnabled']]) {
    await select(page, 'assessment-toolbar-mode', label);
    const header = page.locator('.dashboard-topbar');
    await header.getByRole('button', { name: `بدء ${label}`, exact: true }).click();
    const opening = page.getByRole('dialog', { name: `فتح ${label}`, exact: true });
    await expect(opening.locator('.app-dialog-header__title')).toBeFocused();
    await expect(opening.locator('#assessment-availability-branch')).not.toBeFocused();
    const beforeInvalid = await storedCourse();
    await opening.locator('#assessment-availability-branch').press('ArrowDown');
    await expect(page.getByRole('listbox', { name: 'اختر الفرع', exact: true })).toBeVisible();
    await expect.poll(() => page.locator('.app-dropdown-menu').filter({ visible: true }).evaluate(element =>
      element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length,
    )).toBe(0);
    const openingAudit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(openingAudit.violations).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('listbox').filter({ visible: true })).toHaveCount(0);
    await expect(opening).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(opening).toBeHidden();
    await header.getByRole('button', { name: `بدء ${label}`, exact: true }).click();
    await expect(opening).toBeVisible();
    await expect(header.locator('.dashboard-topbar__label')).toHaveText('مرحبًا');
    await expect(opening.getByRole('spinbutton', { name: 'مدة الفتح بالساعات' })).toHaveValue('1');
    await opening.locator('#assessment-availability-hours').fill('0');
    await opening.getByRole('button', { name: 'فتح الاختبار', exact: true }).click();
    await expect(page.getByText('أدخل مدة صحيحة بالساعات', { exact: true })).toBeVisible();
    const afterInvalid = await storedCourse();
    for (const key of ['isActive', enabledKey, 'branchAvailability', 'assessmentWindows']) expect(afterInvalid[key]).toEqual(beforeInvalid[key]);
    await opening.locator('#assessment-availability-hours').fill('1.5');
    await opening.getByRole('button', { name: 'فتح الاختبار', exact: true }).click();
    await expect(opening).toBeHidden();
    await expect(header.getByRole('button', { name: `إدارة ${label}`, exact: true })).toBeVisible();
    const timer = header.locator('.dashboard-topbar__timer-label').first();
    await expect(timer).toHaveText(/^01:29:\d{2}$/);
    const tick = await timer.textContent();
    await expect(timer).not.toHaveText(tick);
    await page.screenshot({ path: info.outputPath(`${type}-countdown.png`), fullPage: false });
    const active = await storedCourse();
    expect(active.isActive).toBe(true);
    expect(active[enabledKey]).toBe(true);
    for (const branch of ['male', 'female']) {
      expect(active.branchAvailability[branch][type]).toBe(true);
      expect(active.assessmentWindows[branch][type].durationMinutes).toBe(90);
      const window = active.assessmentWindows[branch][type];
      expect(new Date(window.closesAt) - new Date(window.opensAt)).toBe(90 * 60000);
    }
    await checkCountdownReturn(page, info, 'الدورات', type);
    await expect(header.getByRole('button', { name: `إدارة ${label}`, exact: true })).toBeVisible();
    await page.reload();
    await select(page, 'assessment-toolbar-mode', label);
    await expect(timer).toBeVisible();
    for (const [choice, remaining] of [['إغلاق معلمين', true], ['إغلاق معلمات', false]]) {
      await header.getByRole('button', { name: `إدارة ${label}`, exact: true }).click();
      const manage = page.getByRole('dialog', { name: `إدارة ${label}`, exact: true });
      await select(page, 'assessment-manage-action', choice, 'الإجراء');
      await manage.getByRole('button', { name: 'تأكيد', exact: true }).click();
      await expect(manage).toBeHidden();
      const saved = await storedCourse();
      expect(saved[enabledKey]).toBe(remaining);
      expect(saved.branchAvailability.male[type]).toBe(false);
      expect(saved.branchAvailability.female[type]).toBe(remaining);
    }
    await page.reload();
    await select(page, 'assessment-toolbar-mode', label);
    await expect(header.getByRole('button', { name: `بدء ${label}`, exact: true })).toBeVisible();
  }
});
