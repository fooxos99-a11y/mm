import { expect, test } from './support/isolatedTest.mjs';
import { login } from './support/gesture-helpers.mjs';

test('notification templates use shared inputs, retain failed edits and persist all four templates', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await login(page);
  await page.goto('dashboard?panel=settings&settingsItem=templates');
  const templates = {
    pre: 'قالب الاختبار القبلي\nنص تجريبي محفوظ',
    post: 'قالب الاختبار البعدي\nنص تجريبي محفوظ',
    tasks: 'قالب المهام الأدائية\nنص تجريبي محفوظ',
    'final-exam': 'قالب النهائي لفرع {branchLabel} لمدة {durationMinutes} دقيقة.',
  };
  for (const [id, text] of Object.entries(templates)) {
    const field = page.locator(`#admin-templates-${id}`);
    await expect(field).toBeEditable();
    await field.fill(text);
    const control = field.locator('..');
    await expect(control).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(control).toHaveCSS('border-radius', '8px');
    await expect(control).toHaveCSS('border-top-style', 'solid');
  }
  const save = page.getByRole('button', { name: 'حفظ', exact: true });
  const fail = route => route.fulfill({ status: 503, json: { message: 'تعذر حفظ القوالب مؤقتًا' } });
  await page.route('**/api/dashboard/courses/*', fail);
  await page.route('**/notification-template', fail);
  await save.click();
  await expect(page.getByText('تعذر حفظ القوالب مؤقتًا', { exact: true })).toBeVisible();
  await expect(save).toBeEnabled();
  for (const [id, text] of Object.entries(templates)) await expect(page.locator(`#admin-templates-${id}`)).toHaveValue(text);
  await page.unroute('**/api/dashboard/courses/*', fail);
  await page.unroute('**/notification-template', fail);
  await save.click();
  await expect(page.getByText('تم حفظ القوالب', { exact: true })).toBeVisible();
  await page.reload();
  for (const [id, text] of Object.entries(templates)) await expect(page.locator(`#admin-templates-${id}`)).toHaveValue(text);
  const snapshotResponse = await page.request.get(`${new URL(process.env.VUE_APP_API_BASE_URL).origin}/api/dashboard/snapshot`, {
    headers: { Accept: 'application/json', Referer: page.url() },
  });
  expect(snapshotResponse.ok(), `snapshot: ${snapshotResponse.status()} ${await snapshotResponse.text()}`).toBeTruthy();
  const snapshot = await snapshotResponse.json();
  expect(snapshot.courses.length).toBeGreaterThan(0);
  for (const course of snapshot.courses) {
    expect(course.assessmentNotificationTemplates).toMatchObject({ pre: templates.pre, post: templates.post, tasks: templates.tasks });
  }
  for (const branch of ['male', 'female']) expect(snapshot.finalExamSettings[branch].notificationTemplate).toBe(templates['final-exam']);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width);

  const inspectScrollbar = element => ({
    width: getComputedStyle(element, '::-webkit-scrollbar').width,
    height: getComputedStyle(element, '::-webkit-scrollbar').height,
    thumb: getComputedStyle(element, '::-webkit-scrollbar-thumb').backgroundColor,
    track: getComputedStyle(element, '::-webkit-scrollbar-track').backgroundColor,
    buttons: getComputedStyle(element, '::-webkit-scrollbar-button').display,
  });
  const rootScrollbar = await page.locator('html').evaluate(inspectScrollbar);
  expect(rootScrollbar).toMatchObject({ width: '4px', height: '4px', track: 'rgba(0, 0, 0, 0)', buttons: 'none' });
  if (page.viewportSize().width <= 1024) await page.getByRole('button', { name: 'فتح القائمة', exact: true }).click();
  const sidebar = page.locator('.dashboard-sidebar');
  await expect(sidebar).toBeVisible();
  const sidebarScrollbar = await sidebar.evaluate(inspectScrollbar);
  expect(sidebarScrollbar).toMatchObject({ width: '4px', height: '4px', track: rootScrollbar.track, buttons: 'none' });
  expect([rootScrollbar.thumb, 'rgb(29, 106, 133)']).toContain(sidebarScrollbar.thumb);
  if (page.viewportSize().width <= 1024) await page.getByRole('button', { name: 'إغلاق القائمة', exact: true }).click();
  expect(errors).toEqual([]);
});
