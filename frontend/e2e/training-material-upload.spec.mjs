import { expect, test } from './support/isolatedTest.mjs';
import { selectOption } from './support/gesture-helpers.mjs';
import { adminLogin, adminPassword } from './support/credentials.mjs';

test('training upload shows size limit and Arabic server failure on mobile and desktop', async ({ page }) => {
  await page.goto('login');
  await page.locator('input[autocomplete="username"]').fill(adminLogin);
  await page.locator('input[autocomplete="current-password"]').fill(adminPassword);
  await Promise.all([
    page.waitForURL((url) => url.pathname === '/momars/dashboard'),
    page.locator('form button[type="submit"]').click(),
  ]);
  await page.goto('dashboard?panel=materials');
  await page.getByLabel('المادة التدريبية', { exact: true })
    .locator('xpath=ancestor::div[contains(@class,"v-input")]').locator('.v-field').click();
  await selectOption(page, 'إضافة مادة');
  const dialog = page.locator('.admin-training-materials__dialog');
  await expect(dialog.getByText('الحد الأقصى لكل ملف: 100 ميجابايت.')).toBeVisible();
  await dialog.locator('.admin-training-materials__input').first().fill('اختبار رفع المرفقات');
  await page.locator('.admin-training-materials__hidden-file-input').setInputFiles({
    name: 'guide.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 training'),
  });
  const reason = 'تعذر كتابة الملف على الخادم. تواصل مع الدعم.';
  await page.route('**/api/dashboard/training-materials', (route) => route.fulfill({
    status: 422, contentType: 'application/json',
    body: JSON.stringify({ errors: { 'attachments.0.file': [reason] } }),
  }));
  await dialog.getByRole('button', { name: 'إضافة المادة', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText(reason);
  const bounds = await dialog.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize().width + 1);
});
