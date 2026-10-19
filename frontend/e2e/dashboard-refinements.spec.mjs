import { expect, test } from './support/isolatedTest.mjs';
import { login, selectOption } from './support/gesture-helpers.mjs';

async function api(page, context, method, route, data) {
  const origin = new URL(process.env.VUE_APP_API_BASE_URL).origin;
  const cookie = (await context.cookies(origin)).find(item => item.name === 'XSRF-TOKEN');
  const response = await page.request.fetch(`${origin}/api${route}`, {
    method, data, headers: { Accept: 'application/json', Referer: page.url(), 'X-XSRF-TOKEN': decodeURIComponent(cookie?.value || '') },
  });
  expect(response.ok(), `${method} ${route}: ${response.status()} ${await response.text()}`).toBeTruthy();
  return response.status() === 204 ? null : response.json();
}

async function choose(page, id, label) {
  await page.locator(`#${id}`).locator('xpath=ancestor::div[contains(@class,"v-input")]').locator('.v-field').click();
  await selectOption(page, label, { exact: true });
}

async function goPanel(page, label, selector) {
  await expect(page.locator('.dashboard-topbar')).toBeVisible();
  const nav = page.getByRole('navigation');
  if (page.viewportSize().width <= 1024 && !await nav.isVisible()) await page.getByRole('button', { name: 'فتح القائمة', exact: true }).click();
  const destination = nav.getByRole('button', { name: label, exact: true });
  if (!await destination.isVisible()) await nav.getByRole('button', { name: 'الاعدادات', exact: true }).click();
  await destination.click();
  await expect(page.locator(selector)).toBeVisible();
  await expect(page.locator('dialog.dashboard-sidebar[open]')).toHaveCount(0);
}

const bounds = locator => locator.evaluate(element => {
  const rect = element.getBoundingClientRect();
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
});

test('overview is one course-style card and course filters retain their positions across modes', async ({ page }) => {
  await login(page);
  await expect(page.locator('#overview .app-card')).toHaveCount(1);
  await expect(page.locator('#overview .app-indicator-card')).toHaveCount(6);
  for (const metric of await page.locator('#overview .app-indicator-card').all()) {
    await expect(metric).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(metric).toHaveCSS('border-top-width', '0px');
  }
  const title = page.getByRole('heading', { name: 'المؤشرات الإجمالية', exact: true });
  await expect(title).toHaveCSS('font-size', '14px');
  const overview = await bounds(page.locator('.dashboard-overview-card'));
  await goPanel(page, 'الدورات', '#assessment-toolbar-course');
  const card = await bounds(page.locator('.admin-workspace-card').first());
  expect(Math.abs(card.x - overview.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(card.width - overview.width)).toBeLessThanOrEqual(1);
  const original = { course: await bounds(page.locator('.app-select').filter({ has: page.locator('#assessment-toolbar-course') })),
    mode: await bounds(page.locator('.app-select').filter({ has: page.locator('#assessment-toolbar-mode') })) };
  for (const mode of ['الاختبار القبلي', 'الاختبار البعدي', 'المؤشرات', 'التحضير']) {
    await choose(page, 'assessment-toolbar-mode', mode);
    for (const [key, id] of [['course', 'assessment-toolbar-course'], ['mode', 'assessment-toolbar-mode']]) {
      const current = await bounds(page.locator('.app-select').filter({ has: page.locator(`#${id}`) }));
      for (const dimension of ['x', 'y', 'width', 'height']) expect(Math.abs(current[dimension] - original[key][dimension]), `${mode} ${key} ${dimension}`).toBeLessThanOrEqual(1);
    }
    if (mode.includes('اختبار')) await expect(page.locator('.assessment-toolbar__branch-slot .app-select')).toHaveCount(0);
  }
  const bulk = page.getByRole('button', { name: /^(إلغاء )?تحضير الكل$/ });
  const row = page.locator('.assessment-attendance__row .attendance-toggle').first();
  await expect(row).toBeVisible();
  expect((await bounds(bulk)).height).toBe((await bounds(row)).height);
  expect((await bounds(bulk)).width).toBeLessThan(200);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width + 1);
});

test('task selector and link share a row in both question and document tasks', async ({ page, context }) => {
  await login(page);
  const tasks = [];
  for (const taskMode of ['questions', 'document']) tasks.push(await api(page, context, 'POST', '/dashboard/courses', {
    title: `اختبار صف المهمة ${taskMode}`, entityType: 'task', taskMode, isActive: false,
  }));
  await page.goto(`dashboard?panel=tasks&courseId=${tasks[0].id}`);
  for (const task of tasks) {
    await choose(page, 'assessment-toolbar-course', task.title);
    const selector = await bounds(page.locator('.app-select').filter({ has: page.locator('#assessment-toolbar-course') }));
    const link = await bounds(page.locator('#assessment-task-video'));
    expect(Math.abs(selector.y - link.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(selector.width - link.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(selector.height - link.height)).toBeLessThanOrEqual(1);
    expect(link.x + link.width).toBeLessThan(selector.x);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width + 1);
});

test('sidebar animates both ways, releases scroll and supports reduced motion', async ({ page }) => {
  test.skip(page.viewportSize().width > 1024, 'Desktop uses the permanently visible sidebar.');
  await login(page);
  await expect(page.locator('#overview')).toBeVisible();
  const opener = page.getByRole('button', { name: 'فتح القائمة', exact: true });
  const sidebar = page.locator('dialog.dashboard-sidebar');
  const menuIcon = await opener.locator('svg path').getAttribute('d');
  await opener.click();
  await expect(sidebar.getByRole('button', { name: 'إغلاق القائمة', exact: true }).locator('svg path')).toHaveAttribute('d', menuIcon);
  await expect(sidebar).not.toContainText('×');
  await expect(sidebar).toBeVisible();
  await expect(sidebar).toHaveClass(/dashboard-sidebar--open/);
  await expect.poll(() => sidebar.evaluate(element => element.getAnimations().filter(animation => animation.playState === 'running').length)).toBe(0);
  await expect(page.locator('body')).toHaveCSS('position', 'fixed');
  // Capture the closing state immediately: the native dialog must stay open while it slides out.
  const closing = await sidebar.evaluate(element => {
    element.querySelector('[aria-label="إغلاق القائمة"]').click();
    return new Promise(resolve => requestAnimationFrame(() => resolve({ open: element.open,
      moving: element.getAnimations().some(animation => animation.playState === 'running') })));
  });
  expect(closing).toEqual({ open: true, moving: true });
  await expect(sidebar).not.toHaveAttribute('open');
  await expect(page.locator('body')).not.toHaveCSS('position', 'fixed');
  await expect(opener).toBeFocused();
  await opener.click();
  const reversed = await sidebar.evaluate(async element => {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const before = Number(getComputedStyle(element, '::backdrop').opacity);
    element.querySelector('[aria-label="إغلاق القائمة"]').click();
    await new Promise(resolve => requestAnimationFrame(resolve));
    return { before, after: Number(getComputedStyle(element, '::backdrop').opacity) };
  });
  expect(Math.abs(reversed.after - reversed.before)).toBeLessThan(.25);
  await expect(sidebar).not.toHaveAttribute('open');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await opener.click();
  await expect(sidebar).toHaveAttribute('open', '');
  expect(await sidebar.evaluate(element => element.getAnimations().length)).toBe(0);
  await page.keyboard.press('Escape');
  await expect(sidebar).not.toHaveAttribute('open');
  await expect(opener).toBeFocused();
});

test('archive counts validate and persist, disabled primary text stays white and deletion is a standalone button below the records', async ({ page }) => {
  await login(page);
  await goPanel(page, 'الأرشيف', '.admin-archive-view');
  await page.locator('.dashboard-topbar').getByRole('button', { name: 'إضافة', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'إضافة أرشيف جديد', exact: true });
  const add = dialog.getByRole('button', { name: 'إضافة', exact: true });
  await expect(add).toBeDisabled();
  await expect(add).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(add).toHaveCSS('opacity', '1');
  const name = `أرشيف أعداد ${page.viewportSize().width}`;
  await dialog.locator('#archive-create-name').fill(name);
  const values = { 'courses-count': 4, 'tasks-count': 7, 'male-teachers-count': 12, 'female-teachers-count': 9, 'completed-parts-count': 134 };
  for (const [id, value] of Object.entries(values)) await dialog.locator(`#archive-create-${id}`).fill(String(value));
  await dialog.locator('#archive-create-tasks-count').fill('-1');
  await expect(add).toBeDisabled();
  await dialog.locator('#archive-create-tasks-count').fill('7');
  await page.route('**/api/dashboard/archives', route => route.request().method() === 'POST'
    ? route.fulfill({ status: 422, json: { message: 'تحقق من أعداد الأرشيف.', errors: { tasks_count: ['راجع عدد المهام الأدائية.'] } } }) : route.continue());
  await add.click();
  await expect(dialog.getByText('راجع عدد المهام الأدائية.', { exact: true })).toBeVisible();
  await expect(dialog.locator('#archive-create-completed-parts-count')).toHaveValue('134');
  await page.unroute('**/api/dashboard/archives');
  await dialog.locator('#archive-create-tasks-count').fill('7');
  await add.click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.admin-archive-view__summary')).toHaveCount(0);
  const saved = (await api(page, page.context(), 'GET', '/dashboard/archives')).find(archive => archive.name === name);
  expect(Object.keys(values).map(key => saved[key.replaceAll('-', '_')])).toEqual(Object.values(values));
  await expect(page.getByRole('button', { name: 'إجراءات الأرشيف', exact: true })).toHaveCount(0);
  const remove = page.getByRole('button', { name: `حذف الأرشيف ${name}`, exact: true });
  await expect(remove).toBeVisible();
  const footer = await bounds(page.locator('.admin-archive-view__footer'));
  const records = await bounds(page.locator('.admin-archive-view__workspace'));
  expect(footer.y).toBeGreaterThanOrEqual(records.y + records.height);
  await remove.click();
  const deletion = page.getByRole('dialog', { name: 'تأكيد حذف الأرشيف', exact: true });
  await expect(deletion).toContainText(name);
  await deletion.getByRole('button', { name: 'إلغاء', exact: true }).click();
  await expect(remove).toBeVisible();
});
