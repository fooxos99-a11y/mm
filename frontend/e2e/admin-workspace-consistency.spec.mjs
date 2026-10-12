import { expect, test } from './support/isolatedTest.mjs';
import { login } from './support/gesture-helpers.mjs';
import { rolePassword } from './support/credentials.mjs';

const choose = async (page, id, name) => {
  await page.locator(`#${id}`).locator('xpath=ancestor::div[contains(@class,"v-input")]').locator('.v-field').click();
  await page.getByRole('option').filter({ hasText: name }).click();
};
const selectedText = (page, id) => page.locator(`#${id}`)
  .locator('xpath=ancestor::div[contains(@class,"v-input")]').locator('.v-select__selection-text');
const noOverflow = async (page) => {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width + 1);
};
const api = async (page, context, method, route, data) => {
  const origin = new URL(process.env.VUE_APP_API_BASE_URL).origin;
  const cookie = (await context.cookies(origin)).find(item => item.name === 'XSRF-TOKEN');
  const response = await page.request.fetch(`${origin}/api/dashboard/${route}`, {
    method, data, headers: { Accept: 'application/json', Referer: page.url(), 'X-XSRF-TOKEN': decodeURIComponent(cookie?.value || '') },
  });
  expect(response.ok(), `${route}: ${response.status()}`).toBeTruthy();
  return response.status() === 204 ? null : response.json();
};

test('administrative pages select available defaults and share card and field geometry', async ({ page, context }, info) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await login(page);
  const snapshot = await api(page, context, 'GET', 'snapshot');
  const firstCourse = snapshot.courses.find(course => course.entityType !== 'task');
  const firstTask = snapshot.courses.find(course => course.entityType === 'task');
  const geometries = [];
  for (const [panel, id, expected] of [
    ['courses', 'assessment-toolbar-course', firstCourse.title],
    ['tasks', 'assessment-toolbar-course', firstTask.title],
    ['finalexam', 'final-exam-question-branch', 'معلمين'],
    ['satisfaction', 'satisfaction-course', firstCourse.title],
    ['materials', 'training-materials-select', 'كل المواد'],
    ['results', 'results-filter-type', 'التحضير'],
    ['completion', 'completion-status-filter', 'الجميع'],
  ]) {
    await page.goto(`dashboard?panel=${panel}`);
    await expect(selectedText(page, id)).toHaveText(expected);
    if (panel === 'completion') {
      await expect(selectedText(page, 'completion-student')).not.toHaveText('');
      await expect(page.locator('.completion-panel__head')).toBeVisible();
    }
    const card = page.locator('.admin-workspace-card').first();
    await expect(card).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    geometries.push(await card.evaluate(element => {
      const rect = element.getBoundingClientRect();
      const header = document.querySelector('.dashboard-topbar').getBoundingClientRect();
      const field = element.querySelector('.v-field').getBoundingClientRect();
      const label = element.querySelector('.app-filter-field__label');
      return { x: rect.x, width: rect.width, topGap: rect.top - header.bottom, fieldHeight: field.height,
        fontSize: getComputedStyle(label).fontSize, weight: getComputedStyle(label).fontWeight };
    }));
    await noOverflow(page);
    await page.screenshot({ path: info.outputPath(`${panel}.png`), fullPage: true });
  }
  for (const geometry of geometries) {
    for (const property of ['x', 'width', 'topGap', 'fieldHeight']) {
      expect(Math.abs(geometry[property] - geometries[0][property]), JSON.stringify(geometries)).toBeLessThanOrEqual(1);
    }
    expect(geometry.fontSize).toBe(geometries[0].fontSize);
    expect(geometry.weight).toBe(geometries[0].weight);
  }
  await page.goto('dashboard?panel=courses');
  for (const mode of ['التحضير', 'المؤشرات']) {
    await choose(page, 'assessment-toolbar-mode', mode);
    const boxes = await page.locator('.app-filter-toolbar .v-field').evaluateAll(fields => fields.map(field => {
      const rect = field.getBoundingClientRect(); return { y: rect.y, height: rect.height };
    }));
    expect(boxes).toHaveLength(3);
    expect(new Set(boxes.map(box => Math.round(box.height))).size).toBe(1);
    if (page.viewportSize().width >= 768) expect(new Set(boxes.map(box => Math.round(box.y))).size).toBe(1);
    await noOverflow(page);
    await page.screenshot({ path: info.outputPath(`courses-${mode === 'التحضير' ? 'attendance' : 'indicators'}.png`), fullPage: true });
  }
  expect(errors).toEqual([]);
});

test('delayed catalogs choose the first course and switching courses keeps the chosen type', async ({ page, context }) => {
  await login(page);
  const catalog = await api(page, context, 'GET', 'results/catalog');
  await page.route('**/dashboard/results/catalog', async route => {
    await new Promise(resolve => setTimeout(resolve, 600));
    await route.continue();
  });
  await page.goto('dashboard?panel=results');
  await expect(selectedText(page, 'results-filter-course')).toHaveText(catalog.find(course => course.entityType !== 'task').title);
  await expect(selectedText(page, 'results-filter-type')).toHaveText('التحضير');
  const other = await api(page, context, 'POST', 'courses', { title: 'دورة أخرى للاختيار', isActive: false });
  await page.goto('dashboard?panel=courses');
  await choose(page, 'assessment-toolbar-mode', 'الاختبار البعدي');
  await choose(page, 'assessment-toolbar-course', other.title);
  await expect(selectedText(page, 'assessment-toolbar-mode')).toHaveText('الاختبار البعدي');
  await expect(selectedText(page, 'assessment-toolbar-course')).toHaveText(other.title);
  const draft = page.locator('.assessment-form-card--inline');
  await page.locator('.assessment-inline-builder__add').click();
  await page.getByRole('button', { name: 'خيارات', exact: true }).click();
  await expect(draft.getByRole('button', { name: 'حذف السؤال 1', exact: true })).toHaveCount(0);
  await draft.locator('input[placeholder="اكتب السؤال"]').fill('سؤال جديد');
  const deletion = draft.getByRole('button', { name: 'حذف السؤال 1', exact: true });
  await expect(deletion).toBeVisible();
  const bounds = await draft.evaluate(card => {
    const cardRect = card.getBoundingClientRect();
    const label = card.querySelector('.assessment-form-card__label').getBoundingClientRect();
    const button = card.querySelector('.assessment-form-card__trash').getBoundingClientRect();
    const prompt = card.querySelector('input[placeholder="اكتب السؤال"]').getBoundingClientRect();
    return { leftGap: button.left - cardRect.left, topGap: button.top - cardRect.top, promptGap: prompt.top - button.bottom,
      labelLeft: label.left, buttonRight: button.right, width: button.width, height: button.height };
  });
  expect(bounds.leftGap).toBeGreaterThanOrEqual(0);
  expect(bounds.leftGap).toBeLessThanOrEqual(18);
  expect(bounds.topGap).toBeGreaterThanOrEqual(0);
  expect(bounds.topGap).toBeLessThanOrEqual(18);
  expect(bounds.promptGap).toBeGreaterThanOrEqual(0);
  expect(bounds.buttonRight).toBeLessThanOrEqual(bounds.labelLeft);
  expect(bounds.width).toBeGreaterThanOrEqual(44);
  expect(bounds.height).toBeGreaterThanOrEqual(44);
  await deletion.click();
  await expect(draft).toHaveCount(0);
  await noOverflow(page);
});

test('directory, notifications and settings share the same card and populated selections', async ({ page, context }, info) => {
  await login(page);
  const archive = await api(page, context, 'POST', 'archives', {
    name: `أرشيف الاختيار التلقائي ${info.project.name}`, courses_count: 0, batch_type: 'all',
  });
  const boxes = [];
  for (const [panel, id, value] of [
    ['courses', 'assessment-toolbar-course', null],
    ['users', 'people-branch-filter', 'معلمين'],
    ['notifications', 'notification-prep-branch', 'كل الفروع'],
    ['settings&settingsItem=archive', 'archive-record-filter', archive.id],
    ['settings&settingsItem=permissions', 'permissions-manager-role', 'male_manager'],
  ]) {
    await page.goto(`dashboard?panel=${panel}`);
    const control = page.locator(`#${id}`);
    if (panel.startsWith('settings')) await expect(control).toHaveValue(value);
    else await expect(selectedText(page, id)).toHaveText(value || /\S/);
    const card = page.locator('.admin-workspace-card').first();
    await expect(card).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    boxes.push(await card.evaluate(element => {
      const card = element.getBoundingClientRect();
      const topbar = document.querySelector('.dashboard-topbar').getBoundingClientRect();
      const label = element.querySelector('.app-filter-field__label');
      const field = element.querySelector('.v-field, .app-native-select').getBoundingClientRect();
      return { left: card.left, width: card.width, topGap: card.top - topbar.bottom,
        fieldHeight: field.height, fontSize: getComputedStyle(label).fontSize, weight: getComputedStyle(label).fontWeight };
    }));
    await noOverflow(page);
    await page.screenshot({ path: info.outputPath(`${panel.split('&')[0]}-${id}.png`), fullPage: true });
    if (id === 'archive-record-filter' && page.viewportSize().width >= 768) {
      const labels = await page.locator('.app-filter-toolbar .app-filter-field__label').evaluateAll(items =>
        items.map(item => item.getBoundingClientRect().y));
      expect(Math.abs(labels[0] - labels[1])).toBeLessThanOrEqual(1);
    }
  }
  for (const box of boxes) {
    for (const property of ['left', 'width', 'topGap', 'fieldHeight']) {
      expect(Math.abs(box[property] - boxes[0][property]), JSON.stringify(boxes)).toBeLessThanOrEqual(1);
    }
    expect(box.fontSize).toBe(boxes[0].fontSize);
    expect(box.weight).toBe(boxes[0].weight);
  }
});

test('empty catalogs stay usable without opening creation dialogs or writing data', async ({ page, context }) => {
  await login(page);
  const snapshot = await api(page, context, 'GET', 'snapshot');
  const writes = [];
  page.on('request', request => {
    if (request.url().includes('/dashboard/') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) writes.push(request.url());
  });
  await page.route('**/dashboard/snapshot*', route => route.fulfill({ json: { ...snapshot, courses: [], satisfactionQuestions: [] } }));
  for (const panel of ['courses', 'tasks', 'satisfaction']) {
    await page.goto(`dashboard?panel=${panel}`);
    await expect(page.locator('.admin-workspace-card').first()).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('.app-filter-toolbar').first()).toBeVisible();
    await noOverflow(page);
  }
  expect(writes).toEqual([]);
});

for (const [role, branch] of [['male_manager', 'male'], ['female_manager', 'female']]) {
  test(`${role} defaults stay within the managed branch`, async ({ page }) => {
    const requestedBranches = [];
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname.endsWith('/dashboard/results')) requestedBranches.push(url.searchParams.get('branchCode'));
    });
    await login(page, `e2e-${role.replaceAll('_', '-')}`, rolePassword);
    for (const panel of ['courses', 'finalexam', 'results']) {
      await page.goto(`dashboard?panel=${panel}`);
      await expect(page.locator('.admin-workspace-card').first()).toBeVisible();
      await expect(page.getByRole('combobox', { name: 'الفرع', exact: true })).toHaveCount(0);
      await expect(page.locator('.dashboard-error')).toHaveCount(0);
      if (panel === 'courses') await expect(selectedText(page, 'assessment-toolbar-course')).not.toHaveText('');
      if (panel === 'results') {
        await expect(selectedText(page, 'results-filter-type')).toHaveText('التحضير');
        await expect.poll(() => requestedBranches.at(-1)).toBe(branch);
      }
      await noOverflow(page);
    }
  });
}
