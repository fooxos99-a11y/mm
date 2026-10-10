import { expect, test } from './support/isolatedTest.mjs';
import { login } from './support/gesture-helpers.mjs';

test.use({ actionTimeout: 20_000 });

test('shared dialog names follow pre, post, tasks and edit titles after reuse', async ({ page }) => {
  await login(page);
  await page.goto('dashboard?panel=courses');
  const courses = page.locator('.assessment-select:visible').first();
  await courses.locator('.v-field').click();
  await page.getByText('دورة اختبار الواجهة', { exact: true }).click();
  for (const [mode, title] of [['الاختبار القبلي', 'فتح الاختبار القبلي'], ['الاختبار البعدي', 'فتح الاختبار البعدي']]) {
    const type = page.getByRole('combobox', { name: 'النوع', exact: true });
    await type.locator('xpath=ancestor::div[contains(@class,"v-field")][1]').click();
    await page.getByRole('option', { name: mode, exact: true }).click();
    await page.getByRole('button', { name: `بدء ${mode}`, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: title, exact: true });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'إلغاء', exact: true }).click();
  }
  await page.goto('dashboard?panel=tasks');
  await page.locator('.assessment-select:visible').first().locator('.v-field').click();
  await page.getByText('مهمة اختبار الواجهة', { exact: true }).click();
  await page.getByRole('button', { name: 'بدء المهمة الأدائية', exact: true }).click();
  const taskDialog = page.getByRole('dialog', { name: 'فتح المهام الأدائية', exact: true });
  await expect(taskDialog).toBeVisible();
  await taskDialog.getByRole('button', { name: 'إلغاء', exact: true }).click();
  await page.goto('dashboard?panel=users');
  await page.locator('.dashboard-topbar').getByRole('button', { name: 'إضافة', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveAccessibleName('إضافة معلم/ة');
  await page.getByRole('dialog').getByRole('button', { name: 'إلغاء', exact: true }).click();
  await page.locator('.people-card').first().getByRole('button', { name: 'تعديل المعلم', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveAccessibleName('تعديل معلم/ة');
});

test('public duplicate submissions keep one pending request and show a recoverable error', async ({ page, context }) => {
  await login(page);
  const origin = new URL(process.env.VUE_APP_API_BASE_URL).origin;
  const cookie = (await context.cookies(origin)).find(item => item.name === 'XSRF-TOKEN');
  const headers = { Accept: 'application/json', Referer: page.url(), 'X-XSRF-TOKEN': decodeURIComponent(cookie.value) };
  const opened = await page.request.put(`${origin}/api/dashboard/registration/settings`, { headers, data: { isOpen: true } });
  expect(opened.status()).toBe(204);
  const profile = { name: 'تجربة منع التسجيل المكرر', phone: '0000000000', gender: 'male', age: 22 };
  const results = await Promise.all([0, 1].map(() => page.request.post(`${origin}/api/public/registration-requests`, { headers, data: profile })));
  expect(results.map(result => result.status()).sort()).toEqual([201, 422]);
  await page.goto('about:blank');
  await context.clearCookies();
  await page.goto('registration');
  await page.locator('#registration-name').fill(profile.name);
  await page.locator('#registration-phone').fill(profile.phone);
  await page.locator('.registration-entry__field')
    .filter({ has: page.locator('label[for="registration-gender"]') }).locator('.v-field').click();
  await page.getByRole('option', { name: 'ذكر', exact: true }).click();
  await page.locator('#registration-field-age').fill('22');
  const sent = page.waitForResponse(response => response.url().endsWith('/api/public/registration-requests')
    && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'إرسال الطلب', exact: true }).click();
  expect((await sent).status()).toBe(422);
  await expect(page.getByText('يوجد طلب بهذا الرقم قيد المراجعة. انتظر معالجة الطلب.', { exact: true })).toBeVisible();
  await expect(page.locator('#registration-name')).toHaveValue(profile.name);
  await login(page);
  const snapshot = await page.request.get(`${origin}/api/dashboard/registration`, { headers: { Referer: page.url() } });
  expect(snapshot.status()).toBe(200);
  expect((await snapshot.json()).requests.filter(item => item.phone === profile.phone && item.status === 'pending')).toHaveLength(1);
});
