import { expect, test } from './support/isolatedTest.mjs';
import { login, selectOption } from './support/gesture-helpers.mjs';

async function openPanel(page, label, ready) {
  await expect(page.locator('.dashboard-topbar')).toBeVisible();
  await expect(page.locator('dialog.dashboard-sidebar--closing[open]')).toHaveCount(0);
  const nav = page.getByRole('navigation');
  if (page.viewportSize().width <= 1024 && !await nav.isVisible()) {
    await page.getByRole('button', { name: 'فتح القائمة', exact: true }).click();
  }
  await expect(nav).toBeVisible();
  const destination = nav.getByRole('button', { name: label, exact: true });
  if (!await destination.isVisible()) await nav.getByRole('button', { name: 'الاعدادات', exact: true }).click();
  await destination.click();
  const discard = page.getByRole('dialog', { name: 'تغييرات غير محفوظة', exact: true });
  await expect(page.locator(ready).first().or(discard)).toBeVisible();
  if (await discard.isVisible()) {
    await inspectActions(page, discard);
    await discard.getByRole('button', { name: 'مغادرة دون حفظ', exact: true }).click();
  }
  await expect(page.locator(ready).first()).toBeVisible();
  await expect(page.locator('dialog.dashboard-sidebar[open]')).toHaveCount(0);
}

async function inspectActions(page, scope = page) {
  const bars = scope.locator('.app-action-bar').filter({ visible: true });
  for (const bar of await bars.all()) {
    const layout = await bar.evaluate(element => {
      const bounds = node => {
        const rect = node.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, width: rect.width };
      };
      const primary = element.querySelector('.app-action-bar__primary');
      const secondary = element.querySelector('.app-action-bar__secondary');
      return { primary: primary && bounds(primary), secondary: secondary && bounds(secondary),
        groups: [...element.children].map(group => group.className),
        bounds: bounds(element) };
    });
    if (layout.primary && layout.secondary) {
      expect(layout.primary.right).toBeLessThanOrEqual(layout.secondary.left + 1);
      expect(Math.abs(layout.primary.top - layout.secondary.top)).toBeLessThanOrEqual(1);
      expect(layout.groups[0]).toContain('__secondary');
      expect(layout.groups[1]).toContain('__primary');
    }
    expect(layout.bounds.left).toBeGreaterThanOrEqual(-1);
    expect(layout.bounds.right).toBeLessThanOrEqual(page.viewportSize().width + 1);
  }
  for (const button of await scope.locator('.app-button--control').filter({ visible: true }).all()) {
    const style = await button.evaluate(element => {
      const css = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return { height: rect.height, radius: css.borderRadius, font: css.fontSize,
        weight: css.fontWeight, padding: css.paddingInlineStart, text: element.textContent.trim() };
    });
    expect(style.height, JSON.stringify(style)).toBeGreaterThanOrEqual(48);
    expect(style.radius, JSON.stringify(style)).toBe('8px');
    expect(style.font, JSON.stringify(style)).toBe('16px');
    expect(style.weight, JSON.stringify(style)).toBe('700');
    expect(style.padding, JSON.stringify(style)).toBe('16px');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width + 1);
}

async function inspectDialog(page, selector, closeLabel = 'إلغاء') {
  const dialog = page.locator(selector).filter({ visible: true });
  await expect(dialog).toBeVisible();
  const footer = dialog.locator('.app-action-bar');
  await expect(footer).toBeVisible();
  await inspectActions(page, dialog);
  const secondary = footer.locator('.app-action-bar__secondary .app-button').first();
  const primary = footer.locator('.app-action-bar__primary .app-button').first();
  if (await secondary.isEnabled() && await primary.isEnabled()) {
    await secondary.focus();
    await page.keyboard.press('Tab');
    await expect(primary).toBeFocused();
  }
  await dialog.getByRole('button', { name: closeLabel, exact: true }).click();
  await expect(dialog).toBeHidden();
}

test('all dashboard pages share action positions and button geometry', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await login(page);
  for (const [label, ready] of [
    ['الرئيسية', '#overview'], ['الدورات', '.assessment-attendance'],
    ['المهام الأدائية', '.tasks-page'], ['الاختبار النهائي', '.final-exam-page'],
    ['استبيان الرضا', '#satisfaction-course'], ['المستخدمين', '#people-branch-filter'],
    ['الإشعارات', '#notification-prep-branch'], ['المواد التدريبية', '#training-materials-select'],
    ['النتائج', '#results-filter-type'], ['متطلبات الاجتياز', '#completion-status-filter'],
    ['صفحة رخصة ممارس', '.home-page-settings'], ['الإشراف', '#permissions-manager-role'],
    ['الأرشيف', '#archive-record-filter'], ['التسجيل', '.registration-admin__requests-card'],
    ['القوالب', '#admin-templates-pre'],
  ]) {
    await test.step(label, async () => {
      await openPanel(page, label, ready);
      await inspectActions(page);
    });
  }
  expect(errors).toEqual([]);
});

test('create and confirmation dialogs keep primary left and cancel right', async ({ page }) => {
  await login(page);
  await openPanel(page, 'المستخدمين', '#people-branch-filter');
  await page.locator('.dashboard-topbar').getByRole('button', { name: 'إضافة', exact: true }).click();
  await inspectDialog(page, '.people-dialog');
  const deleteUser = page.getByRole('button', { name: 'حذف المعلم', exact: true }).first();
  await deleteUser.click();
  await inspectDialog(page, '.people-confirm-dialog');

  await openPanel(page, 'استبيان الرضا', '#satisfaction-course');
  await page.locator('.dashboard-topbar').getByRole('button', { name: 'إضافة', exact: true }).click();
  await inspectDialog(page, '.satisfaction-admin__dialog');

  await openPanel(page, 'المواد التدريبية', '#training-materials-select');
  await page.locator('#training-materials-select').locator('xpath=ancestor::div[contains(@class,"v-input")]').locator('.v-field').click();
  await selectOption(page, 'إضافة مادة');
  await inspectDialog(page, '.admin-training-materials__dialog');

  await openPanel(page, 'متطلبات الاجتياز', '#completion-status-filter');
  await page.locator('.dashboard-topbar').getByRole('button', { name: 'متطلبات الاجتياز', exact: true }).click();
  await inspectDialog(page, '.completion-requirements-dialog');
  await page.getByRole('button', { name: 'إغلاق واعتماد النتائج', exact: true }).click();
  await inspectDialog(page, '.completion-confirm');

  await openPanel(page, 'الأرشيف', '#archive-record-filter');
  await page.locator('.dashboard-topbar').getByRole('button', { name: 'إضافة', exact: true }).click();
  await inspectDialog(page, '.archive-dialog');
  await page.getByRole('button', { name: 'أرشفة المحتوى الحالي', exact: true }).click();
  await inspectDialog(page, '.archive-dialog');

  await openPanel(page, 'التسجيل', '.registration-admin__requests-card');
  await page.getByRole('button', { name: 'بيانات التسجيل', exact: true }).click();
  await inspectDialog(page, '.registration-fields-dialog');
});

test('editor and final exam actions retain their behavior and keyboard order', async ({ page }) => {
  await login(page);
  for (const panel of ['courses', 'tasks']) {
    await openPanel(page, panel === 'courses' ? 'الدورات' : 'المهام الأدائية', panel === 'courses' ? '.assessment-attendance' : '.tasks-page');
    if (panel === 'courses') {
      await page.locator('#assessment-toolbar-mode').locator('xpath=ancestor::div[contains(@class,"v-input")]').locator('.v-field').click();
      await selectOption(page, 'الاختبار القبلي');
    }
    const bar = page.locator('.assessment-inline-builder__actions');
    await expect(bar).toBeVisible();
    await inspectActions(page);
    await bar.getByRole('button', { name: panel === 'tasks' ? 'إضافة مهمة أدائية' : 'إضافة سؤال', exact: true }).click();
    await page.getByRole('button', { name: 'نصي', exact: true }).click();
    await expect(page.locator('.assessment-editor-question').last()).toBeVisible();
    await inspectActions(page);
  }
  await openPanel(page, 'الاختبار النهائي', '.final-exam-page');
  await inspectActions(page);
  const topbar = page.locator('.dashboard-topbar');
  const copy = topbar.getByRole('button', { name: 'نسخ', exact: true });
  const start = topbar.getByRole('button', { name: 'بدء', exact: true });
  await copy.focus();
  await page.keyboard.press('Tab');
  await expect(start).toBeFocused();
  await start.click();
  await inspectDialog(page, '.app-dialog');
});
