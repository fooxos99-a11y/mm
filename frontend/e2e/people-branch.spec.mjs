import { expect, test } from './support/isolatedTest.mjs';

test('people editor changes branch and saves female users', async ({ page }, testInfo) => {
  await Promise.all([
    page.waitForResponse(response => response.url().endsWith('/auth/session')),
    page.goto('login'),
  ]);
  await page.locator('input[autocomplete="username"]').fill(process.env.E2E_ADMIN_LOGIN);
  await page.locator('input[autocomplete="current-password"]').fill(process.env.E2E_ADMIN_PASSWORD);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(url => url.pathname === '/momars/dashboard');
  await page.goto('dashboard?panel=users');

  for (const type of ['student', 'reciter']) {
    await page.locator('.dashboard-topbar').getByRole('button', { name: 'إضافة', exact: true }).click();
    const dialog = page.getByRole('dialog');
    if (type === 'reciter') {
      await dialog.locator('.app-select').filter({ has: page.locator('#people-editor-entity-type') }).click();
      await page.getByRole('option', { name: 'مقرئ', exact: true }).click();
    }
    const branch = dialog.locator('.app-select').filter({ has: page.locator('#people-editor-branch') });
    for (const label of ['معلمات', 'معلمين', 'معلمات']) {
      await branch.click();
      await page.getByRole('option', { name: label, exact: true }).click();
      await expect(branch).toContainText(label);
    }
    await expect(dialog.locator('#people-editor-password')).not.toHaveAttribute('placeholder', /.+/);
    await dialog.getByRole('button', { name: 'إضافة', exact: true }).click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(branch).toContainText('معلمات');
    const login = `Branch${type}${testInfo.project.name.replace(/[^a-z0-9]/gi, '')}`;
    await dialog.locator('#people-editor-name').fill(`تجربة الفرع ${type}`);
    await dialog.locator('#people-editor-login-code').fill(login);
    if (process.env.E2E_CAPTURE_SCREENSHOTS === '1') {
      await page.screenshot({ path: testInfo.outputPath(`${type}-female.png`) });
    }
    const saved = page.waitForResponse(response => response.request().method() === 'POST'
      && response.url().endsWith(type === 'student' ? '/students' : '/reciters'));
    await dialog.getByRole('button', { name: 'إضافة', exact: true }).click();
    const response = await saved;
    expect(response.ok()).toBe(true);
    expect(response.request().postDataJSON().branchId).toBe('female');
    await expect(dialog).toHaveCount(0);
    await page.locator('.app-select').filter({ has: page.locator('#people-branch-filter') }).click();
    await page.getByRole('option', { name: type === 'student' ? 'معلمات' : 'مقرئات', exact: true }).click();
    await page.getByRole('searchbox', { name: 'البحث بالاسم أو رقم الدخول' }).fill(login);
    await expect(page.locator('.people-card')).toHaveCount(1);
    await expect(page.locator('.people-card')).toContainText(login);
  }
});
