import { test, expect } from './support/isolatedTest.mjs';

test('student import previews before saving, retains source data and displays the administrator-managed password', async ({ page }, info) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('login');
  await page.locator('[autocomplete="username"]').fill(process.env.E2E_ADMIN_LOGIN);
  await page.locator('[autocomplete="current-password"]').fill(process.env.E2E_ADMIN_PASSWORD);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(/\/dashboard$/);
  await page.goto('dashboard?panel=users');
  await page.locator('.dashboard-topbar').getByRole('button', { name: 'إضافة', exact: true }).click();
  await page.locator('#people-editor-bulk-file').setInputFiles({
    name: 'registrations.csv', mimeType: 'text/csv',
    buffer: Buffer.from('Id,الاسم,الاسم الرباعي,اسم المجمع,الحالة\n1,,طالب استيراد أول,مجمع الاختبار,راسب\n3,,طالب استيراد ثان,مجمع ثان,مجتاز', 'utf8'),
  });
  const preview = page.getByRole('dialog').filter({ hasText: 'مراجعة الإضافة الجماعية' });
  await expect(preview).toContainText('0700');
  await expect(preview).toContainText('0701');
  await expect(preview.locator('tbody tr')).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await preview.screenshot({ path: info.outputPath('import-preview.png') });
  await preview.getByRole('button', { name: 'إضافة 2 حسابًا', exact: true }).click();
  await expect(preview).toHaveCount(0);
  await page.getByRole('dialog').getByRole('button', { name: 'إلغاء', exact: true }).click();
  await page.getByRole('searchbox', { name: 'البحث بالاسم أو رقم الدخول' }).fill('0700');
  await expect(page.locator('.people-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'تعديل المعلم', exact: true }).click();
  const editor = page.getByRole('dialog');
  await expect(editor).toContainText('مجمع الاختبار');
  await expect(editor).toContainText('راسب');
  const initial = editor.getByLabel('كلمة المرور الحالية', { exact: true });
  await expect(initial).toHaveValue('0700');
  await editor.screenshot({ path: info.outputPath('student-initial-password.png') });
  await editor.getByLabel('كلمة المرور الجديدة (اختياري)', { exact: true }).fill('changed-password');
  await editor.getByLabel('تأكيد كلمة المرور', { exact: true }).fill('changed-password');
  await editor.getByRole('button', { name: 'تحديث', exact: true }).click();
  await expect(editor).toHaveCount(0);
  await page.getByRole('button', { name: 'تعديل المعلم', exact: true }).click();
  await expect(editor.getByLabel('كلمة المرور الحالية', { exact: true })).toHaveValue('changed-password');
  expect(errors).toEqual([]);
});
