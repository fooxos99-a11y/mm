import { expect, test } from '@playwright/test';

const adminLogin = process.env.E2E_ADMIN_LOGIN || 'e2e-admin';
const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'E2E-Momars-2026!';

const login = async (page) => {
  await page.goto('login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[autocomplete="username"]').fill(adminLogin);
  await page.locator('input[autocomplete="current-password"]').fill(adminPassword);
  await Promise.all([
    page.waitForURL((url) => url.pathname === '/momars/dashboard'),
    page.locator('form button[type="submit"]').click(),
  ]);
};

const expectNoOverflow = async (page) => {
  const dimensions = await page.evaluate(() => ({
    content: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
    viewport: window.innerWidth,
  }));

  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
};

const openSelectOption = async (page, label, option) => {
  const select = page.getByLabel(label, { exact: true });
  await select.locator('xpath=ancestor::div[contains(@class,"v-input")]').locator('.v-field').click();
  await page.getByText(option, { exact: true }).click();
};

test('remaining dashboard panels expose usable controls and dialogs', async ({ page }, testInfo) => {
  const browserErrors = [];
  const serverErrors = [];
  const previewMaterialTitle = `مادة اختبار المعاينة ${testInfo.project.name}`;

  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 500) serverErrors.push(`${response.status()} ${response.url()}`);
  });

  await login(page);

  await page.goto('dashboard?panel=satisfaction');
  await page.getByRole('button', { name: 'إضافة', exact: true }).click();
  await expect(page.locator('.satisfaction-admin__dialog')).toBeVisible();
  const requiredSwitch = page.getByRole('checkbox', { name: 'سؤال إلزامي' });
  await requiredSwitch.check();
  await expect(requiredSwitch).toBeChecked();
  const activeSwitchColor = await page.locator('.satisfaction-admin__switch .v-switch__track')
    .evaluate((track) => getComputedStyle(track).backgroundColor);
  expect(activeSwitchColor).toBe('rgb(31, 111, 150)');
  await page.getByRole('button', { name: 'إلغاء', exact: true }).click();

  await page.goto('dashboard?panel=users');
  await page.locator('.people-toolbar-button--primary').click();
  await expect(page.locator('.people-dialog:visible')).toBeVisible();
  await page.locator('.people-dialog__cancel:visible').click();

  await page.goto('dashboard?panel=notifications');
  const studentToggle = page.locator('.communications-page__prep-table tbody tr .attendance-toggle').first();
  await expect(studentToggle).toBeVisible();
  await studentToggle.click();
  await expect(studentToggle).toHaveAttribute('aria-label', /^إلغاء تحديد /);

  await page.goto('dashboard?panel=materials');
  await openSelectOption(page, 'المادة التدريبية', 'إضافة مادة');
  await expect(page.locator('.admin-training-materials__dialog')).toBeVisible();
  await page.locator('.admin-training-materials__dialog .admin-training-materials__input').first().fill(previewMaterialTitle);
  await page.locator('.admin-training-materials__hidden-file-input').setInputFiles({
    name: 'preview.png',
    mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'),
  });
  await page.locator('.admin-training-materials__dialog-footer').getByRole('button', { name: 'إضافة المادة', exact: true }).click();
  await expect(page.locator('.admin-training-materials__dialog')).toBeHidden();

  const previewMaterial = page.locator('.training-materials-list__card').filter({
    has: page.getByText(previewMaterialTitle, { exact: true }),
  });
  await previewMaterial.getByRole('button', { name: 'preview', exact: true }).click();
  const previewImage = page.locator('.training-materials-list__preview-image');
  await expect(previewImage).toBeVisible();
  await expect.poll(() => previewImage.evaluate((image) => image.naturalWidth)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'إغلاق', exact: true }).click();
  await previewMaterial.getByRole('button', { name: 'حذف المادة', exact: true }).click();
  await expect(previewMaterial).toBeHidden();

  await page.goto('dashboard?panel=results');
  await openSelectOption(page, 'القسم', 'دورة اختبار الواجهة');
  await openSelectOption(page, 'نوع البيانات', 'التحضير');
  await expect(page.locator('.results-entry').first()).toBeVisible();

  await page.goto('dashboard?panel=completion');
  await page.locator('.dashboard-topbar').getByRole('button', { name: 'متطلبات الاجتياز', exact: true }).click();
  await expect(page.locator('.completion-requirements-dialog')).toBeVisible();
  await page.getByRole('button', { name: 'إلغاء', exact: true }).click();
  await page.getByRole('button', { name: 'إغلاق واعتماد النتائج', exact: true }).click();
  await expect(page.locator('.completion-confirm')).toBeVisible();
  await page.getByRole('button', { name: 'إلغاء', exact: true }).click();

  await page.goto('dashboard?panel=settings&settingsItem=archive');
  await page.getByRole('button', { name: 'إضافة', exact: true }).click();
  await expect(page.locator('.archive-dialog:visible')).toBeVisible();
  await page.getByRole('button', { name: 'إلغاء', exact: true }).click();

  await page.goto('dashboard?panel=settings&settingsItem=permissions');
  await page.getByRole('button', { name: 'الإشراف', exact: true }).click();
  await expect(page.locator('.dashboard-accounts-panel:visible').first()).toBeVisible();
  await page.getByRole('button', { name: 'الصلاحيات', exact: true }).click();
  await expect(page.locator('.permissions-admin__permission-row').first()).toBeVisible();

  await expectNoOverflow(page);
  expect(browserErrors).toEqual([]);
  expect(serverErrors).toEqual([]);
});
