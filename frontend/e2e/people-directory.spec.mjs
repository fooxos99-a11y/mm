import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './support/isolatedTest.mjs';

test.use({ actionTimeout: 20_000 });

const prepareDirectory = async ({ page, request }, testInfo) => {
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
  return { api, token, prefix, search, fullSnapshots: () => fullSnapshots };
};

test('people directory searches, pages and edits real server results with usable touch controls', async ({ page, request }, testInfo) => {
  const { prefix, search, fullSnapshots } = await prepareDirectory({ page, request }, testInfo);
  await search.fill(prefix);
  await expect(page.locator('.people-directory-status')).toHaveText('عدد النتائج: 21');
  await expect(page.locator('.people-card')).toHaveCount(20);
  if (process.env.E2E_CAPTURE_SCREENSHOTS === '1') {
    await page.screenshot({ path: testInfo.outputPath('users-populated.png'), fullPage: false });
  }
  const next = page.getByRole('button', { name: 'الصفحة التالية', exact: true });
  expect((await next.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await next.click();
  await expect(page.locator('.people-card')).toHaveCount(1);
  await expect(page.locator('.people-card')).toContainText(`${prefix} معلم 20`);
  await search.fill('doesnotexist');
  await expect(page.locator('.people-directory-status')).toHaveText('عدد النتائج: 0');
  await expect(page.locator('.people-card')).toHaveCount(0);
  if (process.env.E2E_CAPTURE_SCREENSHOTS === '1') {
    await page.screenshot({ path: testInfo.outputPath('users-empty.png'), fullPage: false });
  }
  await search.fill(prefix);
  await expect(page.locator('.people-card')).toHaveCount(20);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow).toBe(false);
  expect(fullSnapshots()).toBe(0);
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
  expect(fullSnapshots()).toBe(0);
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

test('people directory pages reciter choices and preserves other links after assigning and unlinking a student', async ({ page, request }, testInfo) => {
  const { api, token, prefix, search, fullSnapshots } = await prepareDirectory({ page, request }, testInfo);
  await search.fill(prefix);
  await expect(page.locator('.people-card')).toHaveCount(20);
  const dialog = page.getByRole('dialog');
  await page.locator('.dashboard-topbar').getByRole('button', { name: 'إضافة', exact: true }).click();
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
  for (let index = 0; index < 21; index++) {
    const created = await request.post(api + '/reciters', {
      headers: { Authorization: 'Bearer ' + token },
      data: { name: 'مقرئ باسم طويل لاختبار التفاف الأسماء داخل المربعات ' + index, loginCode: prefix + 'Extra' + index, branchId: 'male', linkedStudentIds: [] },
    });
    expect(created.ok()).toBe(true);
  }
  const assignmentCard = page.locator('.people-card').nth(1);
  await assignmentCard.getByRole('button', { name: /^المقرئ:/ }).click();
  await expect(dialog.getByRole('searchbox')).toHaveCount(0);
  await expect(dialog.getByRole('heading', { name: 'اختيار المقرئ', exact: true })).toHaveCount(1);
  await expect(dialog.getByRole('button', { name: 'غير مرتبط', exact: true })).toHaveCount(0);
  const tile = dialog.getByRole('button', { name: prefix + ' Reader', exact: true });
  await page.route('**/dashboard/transfer-student', route => route.fulfill({ status: 503, json: { message: 'تعذر حفظ الربط مؤقتًا' } }));
  await tile.click();
  await expect(dialog.getByRole('alert')).toHaveText('تعذر حفظ الربط مؤقتًا');
  await expect(tile).toHaveAttribute('aria-pressed', 'false');
  await page.unroute('**/dashboard/transfer-student');
  await tile.focus();
  await page.keyboard.press('Enter');
  await expect(tile).toHaveAttribute('aria-pressed', 'true');
  await expect(tile).toBeEnabled();
  await expect(dialog).toBeVisible();
  const linked = await request.get(api + '/dashboard/people?type=reciter&search=' + prefix + 'Reader', {
    headers: { Authorization: 'Bearer ' + token },
  });
  expect((await linked.json()).data[0].studentIds).toHaveLength(3);
  await dialog.getByRole('button', { name: 'الصفحة التالية', exact: true }).click();
  await expect(dialog.getByRole('button', { name: '2', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect.poll(() => dialog.getByRole('button', { name: '2', exact: true }).evaluate(el => getComputedStyle(el).color)).toBe('rgb(255, 255, 255)');
  await expect(tile).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width + 1);
  const accessibility = await new AxeBuilder({ page }).include('.people-reciter-dialog').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('reciter-tiles.png'), fullPage: false });
  await tile.click();
  await expect(tile).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'إغلاق', exact: true })).toBeEnabled();
  await dialog.getByRole('button', { name: 'إغلاق', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(assignmentCard).toContainText('غير مرتبط');
  const afterUnlink = await request.get(api + '/dashboard/people?type=reciter&search=' + prefix + 'Reader', {
    headers: { Authorization: 'Bearer ' + token },
  });
  expect((await afterUnlink.json()).data[0].studentIds).toHaveLength(2);
  expect(fullSnapshots()).toBe(0);
});
