import { expect, test } from './support/isolatedTest.mjs';
import { login, selectOption } from './support/gesture-helpers.mjs';

const noOverflow = async page => expect(await page.evaluate(() => document.documentElement.scrollWidth))
  .toBeLessThanOrEqual(page.viewportSize().width + 1);

const api = async (page, context, method, route, data) => {
  const origin = new URL(process.env.VUE_APP_API_BASE_URL).origin;
  const cookie = (await context.cookies(origin)).find(item => item.name === 'XSRF-TOKEN');
  const response = await page.request.fetch(`${origin}/api/dashboard/${route}`, {
    method, data, headers: { Accept: 'application/json', Referer: page.url(), 'X-XSRF-TOKEN': decodeURIComponent(cookie?.value || '') },
  });
  expect(response.ok(), `${method} ${route}: ${response.status()}`).toBeTruthy();
  return response.status() === 204 ? null : response.json();
};

test('overview keeps three compact indicators per mobile row and a usable narrow sidebar', async ({ page }, info) => {
  await login(page);
  const cards = page.locator('.dashboard-indicator-card');
  await expect(cards).toHaveCount(6);
  await expect(cards.first()).toContainText('الأجزاء المقروءة');
  await expect(page.locator('.dashboard-indicator-card__meta')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  if (page.viewportSize().width <= 1024) {
    const boxes = await cards.evaluateAll(items => items.map(item => {
      const rect = item.getBoundingClientRect(); return { x: rect.x, y: Math.round(rect.y), width: rect.width };
    }));
    expect(new Set(boxes.slice(0, 3).map(box => box.y)).size).toBe(1);
    expect(boxes[3].y).toBeGreaterThan(boxes[0].y);
    const label = cards.first().locator('.dashboard-indicator-card__label');
    expect(await label.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  }
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath('overview.png'), fullPage: true });
  if (page.viewportSize().width > 1024) return;
  const opener = page.getByRole('button', { name: 'فتح القائمة', exact: true });
  await expect(opener).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  if (info.project.use.hasTouch) await opener.tap();
  else await opener.click();
  const sidebar = page.locator('dialog.dashboard-sidebar[open]');
  await expect(sidebar).toBeVisible();
  const bounds = await sidebar.boundingBox();
  expect(bounds.width).toBeLessThanOrEqual(260);
  expect(bounds.width).toBeLessThan(page.viewportSize().width - 50);
  const close = sidebar.getByRole('button', { name: 'إغلاق القائمة', exact: true });
  await expect(close).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  expect(await close.evaluate(element => element.matches(':focus-visible'))).toBe(false);
  await page.screenshot({ path: info.outputPath('sidebar.png'), fullPage: false });
  await page.keyboard.press('Escape');
  await expect(sidebar).toHaveCount(0);
  await expect(opener).toBeFocused();
  await opener.press('Enter');
  if (!await close.evaluate(element => element === document.activeElement)) await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await expect(close).toHaveCSS('outline-style', 'solid');
  await close.press('Escape');
});

test('assessment actions align with the menu and long course names stay on one line', async ({ page, context }, info) => {
  await login(page);
  const title = 'تطبيق طريقة تصحيح التلاوة باستخدام استراتيجية تعليم القرآن والتدريب العملي المتقدم';
  const course = await api(page, context, 'POST', 'courses', { title, isActive: false });
  for (const type of ['pre', 'post']) {
    await page.goto(`dashboard?panel=courses&courseId=${course.id}&assessmentType=${type}`);
    await page.locator('#assessment-toolbar-mode').locator('xpath=ancestor::div[contains(@class,"v-input")]').locator('.v-field').click();
    await selectOption(page, type === 'pre' ? 'الاختبار القبلي' : 'الاختبار البعدي', { exact: true });
    const header = page.locator('.dashboard-topbar');
    const action = header.getByRole('button', { name: `بدء الاختبار ${type === 'pre' ? 'القبلي' : 'البعدي'}`, exact: true });
    await expect(action).toBeVisible();
    if (page.viewportSize().width <= 700) {
      // Read both rectangles in one frame so the route transition cannot skew their centers.
      const { button, menu } = await action.evaluate(element => {
        const menuElement = element.closest('.dashboard-topbar').querySelector('.dashboard-topbar__mobile button');
        const actionRect = element.getBoundingClientRect();
        const menuRect = menuElement.getBoundingClientRect();
        return {
          button: { y: actionRect.y, height: actionRect.height, width: actionRect.width },
          menu: { y: menuRect.y, height: menuRect.height },
        };
      });
      expect(Math.abs(button.y + button.height / 2 - menu.y - menu.height / 2)).toBeLessThanOrEqual(1);
      expect(button.width).toBeLessThan(page.viewportSize().width * .65);
      expect(button.height).toBeGreaterThanOrEqual(44);
    }
    const field = page.locator('#assessment-toolbar-course').locator('xpath=ancestor::div[contains(@class,"v-input")]');
    const selected = field.locator('.v-select__selection-text');
    await expect(selected).toHaveText(title);
    await expect(selected).toHaveCSS('white-space', 'nowrap');
    await expect(selected).toHaveCSS('text-overflow', 'ellipsis');
    await field.locator('.v-field').click();
    const row = page.getByRole('row', { name: title, exact: true });
    await expect(row).toBeVisible();
    const label = row.locator('.assessment-course-option-label');
    await expect(label).toHaveAttribute('title', title);
    await expect(label).toHaveCSS('white-space', 'nowrap');
    await expect.poll(() => page.locator('.app-dropdown-menu').filter({ visible: true }).evaluate(element =>
      element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length,
    )).toBe(0);
    const text = await label.evaluate(element => ({
      height: element.getBoundingClientRect().height, lineHeight: parseFloat(getComputedStyle(element).lineHeight),
    }));
    expect(text.height).toBeLessThanOrEqual(text.lineHeight + 1);
    await page.screenshot({ path: info.outputPath(`course-${type}-menu.png`), fullPage: false });
    await selectOption(page, title, { exact: true });
    await noOverflow(page);
    await page.screenshot({ path: info.outputPath(`course-${type}.png`), fullPage: false });
  }
  await page.goto('dashboard?panel=finalexam');
  const header = page.locator('.dashboard-topbar');
  const start = header.getByRole('button', { name: 'بدء', exact: true });
  const copy = header.getByRole('button', { name: 'نسخ', exact: true });
  await expect(start).toBeVisible();
  await expect(copy).toBeVisible();
  const { boxes, menu } = await start.evaluate(element => {
    const header = element.closest('.dashboard-topbar');
    const copy = [...header.querySelectorAll('button')].find(button => button.textContent.trim() === 'نسخ');
    const menu = header.querySelector('.dashboard-topbar__mobile button');
    const bounds = target => {
      const rect = target.getBoundingClientRect();
      return { y: rect.y, height: rect.height };
    };
    return { boxes: [bounds(element), bounds(copy)], menu: bounds(menu) };
  });
  expect(Math.abs(boxes[0].y - boxes[1].y)).toBeLessThanOrEqual(1);
  if (page.viewportSize().width <= 700) {
    expect(Math.abs(boxes[0].y + boxes[0].height / 2 - menu.y - menu.height / 2)).toBeLessThanOrEqual(1);
  }
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath('final-exam.png'), fullPage: false });
  await start.click();
  await expect(page.getByRole('dialog', { name: 'فتح الاختبار النهائي', exact: true })).toBeVisible();
});

test('a saved task response remains visible after closing the task in shell and full snapshot views', async ({ page, context }, info) => {
  await login(page);
  const snapshot = await api(page, context, 'GET', 'snapshot');
  const student = snapshot.students.find(item => item.branchId === 'male');
  const task = await api(page, context, 'POST', 'courses', { title: 'مهمة مؤشر محفوظ', entityType: 'task', isActive: false });
  const question = await api(page, context, 'POST', `courses/${task.id}/questions`, {
    assessmentType: 'tasks', prompt: 'إجابة محفوظة للمؤشر', type: 'text', options: [], allowFile: false, points: 1, correctAnswer: '',
  });
  await api(page, context, 'PUT', `courses/${task.id}`, { isTasksEnabled: true });
  await api(page, context, 'POST', 'assessment-submissions', {
    courseId: task.id, assessmentType: 'tasks', studentName: student.name,
    loginId: student.loginId, answers: [{ questionId: question.id, value: 'إجابة مسلمة' }],
  });
  await api(page, context, 'PUT', `courses/${task.id}`, {
    isTasksEnabled: false, branchAvailability: { male: { tasks: false }, female: { tasks: false } },
  });
  const shell = await api(page, context, 'GET', 'shell');
  const expected = shell.overviewIndicators.all.find(item => item.key === 'tasks');
  expect(expected.progress).toBeGreaterThan(0);
  await page.goto('dashboard?panel=overview');
  const indicator = page.locator('.dashboard-indicator-card').filter({ hasText: 'المهام الأدائية' });
  await expect(indicator).toHaveAccessibleName(`المهام الأدائية: ${expected.display}، ${expected.meta}`);
  await expect(indicator.locator('.dashboard-indicator-ring__inner')).toHaveText(expected.display);
  await page.screenshot({ path: info.outputPath('task-saved-response.png'), fullPage: true });
  await page.goto('dashboard?panel=courses');
  await expect(page.locator('#assessment-toolbar-course')).toBeVisible();
  if (page.viewportSize().width <= 1024) await page.getByRole('button', { name: 'فتح القائمة', exact: true }).click();
  await page.getByRole('navigation').getByRole('button', { name: 'الرئيسية', exact: true }).click();
  await expect(indicator).toHaveAccessibleName(`المهام الأدائية: ${expected.display}، ${expected.meta}`);
});
