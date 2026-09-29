import { expect, test } from '@playwright/test';

test('people directory searches and pages real server results with usable touch controls', async ({ page, request }, testInfo) => {
  const api = `http://127.0.0.1:${process.env.E2E_BACKEND_PORT}/api`;
  const loginCode = process.env.E2E_ADMIN_LOGIN;
  const password = process.env.E2E_ADMIN_PASSWORD;
  const auth = await request.post(`${api}/auth/login`, { data: { login_code: loginCode, password } });
  expect(auth.ok()).toBe(true);
  const token = (await auth.json()).token;
  expect(token).toBeTruthy();
  const prefix = `Dir${testInfo.project.name.replace(/[^a-z0-9]/gi, '')}`;
  let fullSnapshots = 0;
  page.on('request', (request) => {
    if (request.url().includes('/dashboard/snapshot')) fullSnapshots++;
  });
  for (let index = 0; index < 21; index++) {
    const response = await request.post(`${api}/students`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: `${prefix} معلم ${String(index).padStart(2, '0')}`, loginId: `${prefix}${index}`, branchId: 'male' },
    });
    expect(response.status()).toBe(201);
  }
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/auth/session')),
    page.goto('login'),
  ]);
  await page.locator('input[autocomplete="username"]').fill(loginCode);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname === '/momars/dashboard');
  await page.goto('dashboard?panel=users');
  const search = page.getByRole('searchbox', { name: 'البحث بالاسم أو رقم الدخول' });
  await search.fill(prefix);
  await expect(page.locator('.people-directory-status')).toHaveText('عدد النتائج: 21');
  await expect(page.locator('.people-card')).toHaveCount(20);
  await page.screenshot({ path: testInfo.outputPath('users-populated.png'), fullPage: false });
  const next = page.getByRole('button', { name: 'الصفحة التالية', exact: true });
  expect((await next.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await next.click();
  await expect(page.locator('.people-card')).toHaveCount(1);
  await expect(page.locator('.people-card')).toContainText(`${prefix} معلم 20`);
  await search.fill('doesnotexist');
  await expect(page.locator('.people-directory-status')).toHaveText('عدد النتائج: 0');
  await expect(page.locator('.people-card')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('users-empty.png'), fullPage: false });
  await search.fill(prefix);
  await expect(page.locator('.people-card')).toHaveCount(20);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow).toBe(false);
  expect(fullSnapshots).toBe(0);
  await page.route('**/dashboard/people/student/*', (route) => route.fulfill({
    status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'تعذر تحميل بيانات النافذة' }),
  }));
  await page.getByRole('button', { name: 'تعديل المعلم', exact: true }).first().click();
  await expect(page.locator('.people-alert--error')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(search).toBeVisible();
  await page.unroute('**/dashboard/people/student/*');
  await page.getByRole('button', { name: 'تعديل المعلم', exact: true }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder('اسم المعلم/ة', { exact: true }).fill(prefix + ' updated');
  await dialog.getByRole('button', { name: 'تحديث', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.people-card').filter({ hasText: prefix + ' updated' })).toHaveCount(1);
  await page.locator('.people-card').first().locator('.people-metric--clickable').click();
  const part = page.getByRole('dialog').getByRole('button', { name: '1', exact: true });
  await part.click();
  await expect(part).toHaveAttribute('aria-pressed', 'true');
  await expect(part).toBeEnabled();
  await page.keyboard.press('Escape');
  expect(fullSnapshots).toBe(0);
  await page.locator('.people-toolbar-button--primary').click();
  await dialog.locator('.app-select').first().click();
  await page.getByRole('option', { name: 'مقرئ', exact: true }).click();
  await dialog.getByPlaceholder('اسم المقرئ', { exact: true }).fill(prefix + ' Reader');
  await dialog.getByPlaceholder('رقم الدخول', { exact: true }).fill(prefix + 'Reader');
  await dialog.getByRole('searchbox').fill(prefix);
  await expect(dialog.locator('.people-remote-picker__option')).toHaveCount(20);
  expect((await dialog.locator('.people-remote-picker__option').first().boundingBox()).height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
  await dialog.locator('.people-remote-picker__option').first().click();
  await dialog.getByRole('button', { name: 'الصفحة التالية', exact: true }).click();
  await expect(dialog.locator('.people-remote-picker__option')).toHaveCount(1);
  await dialog.locator('.people-remote-picker__option').first().click();
  await expect(dialog).toContainText('المحدد: 2');
  await dialog.getByRole('button', { name: 'إضافة', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const saved = await request.get(api + '/dashboard/people?type=reciter&search=' + prefix + 'Reader', {
    headers: { Authorization: 'Bearer ' + token },
  });
  expect(saved.ok()).toBe(true);
  expect((await saved.json()).data[0].studentIds).toHaveLength(2);
  const assignmentCard = page.locator('.people-card').nth(1);
  await assignmentCard.getByRole('button', { name: /^المقرئ:/ }).click();
  await dialog.getByRole('searchbox').fill(prefix + 'Reader');
  await expect(dialog.locator('.people-remote-picker__option')).toHaveCount(1);
  await dialog.locator('.people-remote-picker__option').click();
  await expect(dialog).toContainText('المحدد: ' + prefix + ' Reader');
  await dialog.getByRole('button', { name: 'حفظ', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(assignmentCard).toContainText(prefix + ' Reader');
  await assignmentCard.getByRole('button', { name: /^المقرئ:/ }).click();
  await dialog.getByRole('button', { name: 'غير مرتبط', exact: true }).click();
  await dialog.getByRole('button', { name: 'حفظ', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(assignmentCard).toContainText('غير مرتبط');
  const afterUnlink = await request.get(api + '/dashboard/people?type=reciter&search=' + prefix + 'Reader', {
    headers: { Authorization: 'Bearer ' + token },
  });
  expect((await afterUnlink.json()).data[0].studentIds).toHaveLength(2);
  expect(fullSnapshots).toBe(0);
  const selectPanel = async (label) => {
    const menu = page.getByRole('button', { name: 'فتح القائمة', exact: true });
    if (await menu.isVisible()) await menu.click();
    await page.locator('.dashboard-nav').getByRole('button', { name: label, exact: true }).click();
  };
  await selectPanel('الدورات');
  await expect(page.locator('.assessment-page')).toBeVisible();
  await selectPanel('الرئيسية');
  await expect(page.locator('.dashboard-indicator-card')).toHaveCount(6);
  await selectPanel('المستخدمين');
  await expect(search).toBeVisible();
});
