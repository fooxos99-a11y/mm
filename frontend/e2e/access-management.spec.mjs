import { expect, test } from './support/isolatedTest.mjs';
import { login, selectOption } from './support/gesture-helpers.mjs';
import { newAccountPassword, rolePassword } from './support/credentials.mjs';

async function choose(page, id, label) {
  await page.locator('.app-select').filter({ has: page.locator(`#${id}`) }).locator('.v-field').click();
  await selectOption(page, label, { exact: true });
}
async function api(page, context, method, path, data, status = 200) {
  const origin = new URL(process.env.VUE_APP_API_BASE_URL).origin;
  const csrf = (await context.cookies(origin)).find(cookie => cookie.name === 'XSRF-TOKEN');
  const response = await page.request.fetch(`${origin}/api${path}`, { method, data,
    headers: { Accept: 'application/json', Referer: page.url(), 'X-XSRF-TOKEN': decodeURIComponent(csrf?.value || '') } });
  expect(response.status(), `${method} ${path}: ${await response.text()}`).toBe(status);
  return status === 204 ? null : response.json();
}
async function openAccess(page) { await login(page); await page.goto('dashboard?panel=settings&settingsItem=permissions'); await expect(page.getByRole('heading', { name: 'الإشراف', exact: true })).toBeVisible({ timeout: 60000 }); }
async function openManagerPanel(page, label, ready) {
  await expect(page.locator('dialog.dashboard-sidebar--closing[open]')).toHaveCount(0);
  const nav = page.locator('.dashboard-nav').filter({ visible: true });
  if (page.viewportSize().width < 1200) await page.getByRole('button', { name: 'فتح القائمة', exact: true }).click();
  await expect(nav).toBeVisible({ timeout: 60000 });
  await nav.getByRole('button', { name: label, exact: true }).click();
  await expect(page.locator(ready)).toBeVisible({ timeout: 60000 });
  await expect(page.locator('dialog.dashboard-sidebar[open]')).toHaveCount(0);
}

test('supervision has only accounts and history with persistent role filters', async ({ page, context }) => {
  await openAccess(page);
  await expect(page.locator('#permissions-search, #dashboard-account-search, #dashboard-account-status')).toHaveCount(0);
  await expect(page.locator('.permissions-admin input[type="checkbox"]')).toHaveCount(0);
  await choose(page, 'permissions-manager-role', 'مشرفة المعلمات');
  await expect(page).toHaveURL(/supervisionRole=female_manager/);
  await page.reload();
  await expect(page.locator('#permissions-manager-role')).toHaveValue('مشرفة المعلمات');
  const accounts = page.locator('.permissions-admin .dashboard-accounts-panel tbody');
  await expect(accounts).toContainText('مشرفة المعلمات');
  await expect(accounts).not.toContainText('مشرف المعلمين');
  await choose(page, 'permissions-section', 'سجل التغييرات');
  await expect(page.getByRole('heading', { name: 'سجل التغييرات', exact: true })).toBeVisible();
  await api(page, context, 'GET', '/dashboard/role-permissions/editor', undefined, 410);
  expect(await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth))).toBeLessThanOrEqual(page.viewportSize().width);
});

test('supervision supports validated create edit delete and visible audit history', async ({ page, context }) => {
  await openAccess(page);
  await choose(page, 'permissions-section', 'الحسابات الإشرافية');
  await expect(page.locator('.permissions-admin .dashboard-accounts-panel .app-table')).toBeVisible();
  await page.locator('.permissions-admin__header').getByRole('button', { name: 'إضافة', exact: true }).click();
  const create = page.getByRole('dialog', { name: 'إضافة حساب إشرافي', exact: true });
  await expect(create).toBeVisible();
  const add = create.getByRole('button', { name: 'إضافة', exact: true });
  await expect(add).toBeDisabled();
  await create.locator('#dashboard-account-name').fill('حساب تجربة الواجهة');
  await create.locator('#dashboard-account-login-code').fill('ui-access-account');
  await create.locator('#dashboard-account-password').fill('short');
  await expect(add).toBeDisabled();
  await create.locator('#dashboard-account-password').fill(newAccountPassword);
  await expect(add).toBeEnabled();
  await page.route('**/api/dashboard/accounts', route => route.request().method() === 'POST'
    ? route.fulfill({ status: 503, json: { message: 'تعذر إضافة الحساب مؤقتًا' } }) : route.continue());
  await add.click();
  await expect(create.getByText('تعذر إضافة الحساب مؤقتًا', { exact: true })).toBeVisible();
  await expect(create.locator('#dashboard-account-name')).toHaveValue('حساب تجربة الواجهة');
  await page.unroute('**/api/dashboard/accounts');
  await add.click(); await expect(create).toBeHidden();
  let row = page.locator('.permissions-admin .dashboard-accounts-panel tbody tr').filter({ hasText: 'حساب تجربة الواجهة' });
  await row.getByRole('button', { name: 'تعديل حساب حساب تجربة الواجهة', exact: true }).click();
  const edit = page.getByRole('dialog', { name: 'تعديل الحساب الإشرافي', exact: true });
  const save = edit.getByRole('button', { name: 'حفظ', exact: true });
  await expect(save).toBeDisabled();
  await edit.locator('#dashboard-account-name').fill('حساب تجربة الواجهة المعدل');
  await expect(save).toBeEnabled(); await save.click(); await expect(edit).toBeHidden();
  row = page.locator('.permissions-admin .dashboard-accounts-panel tbody tr').filter({ hasText: 'حساب تجربة الواجهة المعدل' });
  await expect(row.getByRole('button', { name: /تعطيل|تفعيل/ })).toHaveCount(0);
  await row.getByRole('button', { name: /^حذف حساب/ }).click();
  const deletion = page.getByRole('dialog', { name: 'حذف الحساب؟', exact: true });
  await expect(deletion).toContainText('حساب تجربة الواجهة المعدل');
  await deletion.getByRole('button', { name: 'إلغاء', exact: true }).click();
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: /^حذف حساب/ }).click();
  await deletion.getByRole('button', { name: 'حذف الحساب', exact: true }).click();
  await expect(row).toHaveCount(0);
  const history = await api(page, context, 'GET', '/dashboard/access-history');
  expect(history.some(item => item.event === 'حذف حساب')).toBeTruthy();
  expect(JSON.stringify(history)).not.toContain(newAccountPassword);
  await choose(page, 'permissions-section', 'سجل التغييرات');
  await expect(page.getByRole('heading', { name: 'سجل التغييرات', exact: true })).toBeVisible();
  await expect(page.locator('.access-history__heading').locator('..')).toContainText('حذف حساب');
});

test('closing a dirty account requires an explicit discard', async ({ page }) => {
  await openAccess(page);
  await expect(page.locator('.permissions-admin .dashboard-accounts-panel .app-table')).toBeVisible();
  await page.locator('.permissions-admin__header').getByRole('button', { name: 'إضافة', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'إضافة حساب إشرافي', exact: true });
  await editor.locator('#dashboard-account-name').fill('مسودة حساب إشرافي');
  await editor.getByRole('button', { name: 'إلغاء', exact: true }).click();
  const discard = page.getByRole('dialog', { name: 'إلغاء التعديلات؟', exact: true });
  await discard.getByRole('button', { name: 'متابعة التعديل', exact: true }).click();
  await expect(editor.locator('#dashboard-account-name')).toHaveValue('مسودة حساب إشرافي');
  await editor.getByRole('button', { name: 'إلغاء', exact: true }).click();
  await discard.getByRole('button', { name: 'إلغاء التعديلات', exact: true }).click();
  await expect(editor).toBeHidden();
});

for (const branch of ['male', 'female']) test(`${branch} supervisor automatically manages its branch and cannot enter administration`, async ({ page, context }) => {
  await login(page, `e2e-${branch}-manager`, rolePassword);
  await expect(page.locator('.dashboard-topbar')).toBeVisible({ timeout: 60000 });
  const snapshot = await api(page, context, 'GET', '/dashboard/snapshot');
  const ownPermissions = snapshot.rolePermissions[`${branch}_manager`];
  for (const key of ['page_overview', 'edit_pre_questions', 'edit_post_questions', 'edit_tasks', 'edit_final_questions', 'open_final_exam', 'manage_materials', 'manage_notifications']) expect(ownPermissions[key], key).toBe(true);
  expect(snapshot.students.every(student => student.branchId === branch)).toBeTruthy();
  expect(snapshot.finalExamQuestions.every(question => question.branchCode === branch)).toBeTruthy();
  await openManagerPanel(page, 'الدورات', '#assessment-toolbar-course');
  await choose(page, 'assessment-toolbar-course', 'إضافة دورة جديدة');
  const createCourse = page.getByRole('dialog', { name: 'إضافة دورة جديدة', exact: true });
  await expect(createCourse).toBeVisible();
  await createCourse.getByRole('button', { name: 'إلغاء', exact: true }).click();
  await openManagerPanel(page, 'استبيان الرضا', '#satisfaction-course');
  await expect(page.locator('.dashboard-topbar').getByRole('button', { name: 'إضافة', exact: true })).toBeEnabled();
  await openManagerPanel(page, 'الإشعارات', '#notification-prep-branch');
  await expect(page.locator('#notification-prep-message')).toBeEnabled();
  for (const path of ['/dashboard/accounts', '/dashboard/role-permissions/editor', '/dashboard/access-history']) await api(page, context, 'GET', path, undefined, 403);
  await api(page, context, 'PUT', `/dashboard/final-exam/settings/${branch === 'male' ? 'female' : 'male'}`, { isEnabled: true }, 403);
});

test('loading accounts does not block navigation away from supervision', async ({ page }) => {
  await login(page);
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  await page.route('**/api/dashboard/accounts', async route => {
    if (route.request().method() !== 'GET') return route.continue();
    await pending;
    await route.fulfill({ json: [] });
  });
  try {
    await page.goto('dashboard?panel=settings&settingsItem=permissions');
    await expect(page.getByRole('heading', { name: 'الإشراف', exact: true })).toBeVisible({ timeout: 60000 });
    await expect(page.locator('.permissions-admin__header').getByRole('button', { name: 'إضافة', exact: true })).toBeDisabled();
    await openManagerPanel(page, 'الأرشيف', '#archive-record-filter');
  } finally {
    release();
    await page.unrouteAll({ behavior: 'wait' });
  }
});

test('stale account edits preserve typed input and refresh the record before reopening', async ({ page, context }) => {
  await openAccess(page);
  const account = await api(page, context, 'POST', '/dashboard/accounts', {
    name: 'حساب اختبار التعارض', loginCode: 'ui-stale-account', role: 'male_manager', password: newAccountPassword,
  }, 201);
  await page.reload();
  await choose(page, 'permissions-section', 'الحسابات الإشرافية');
  const panel = page.locator('.permissions-admin .dashboard-accounts-panel');
  await panel.getByRole('button', { name: 'تعديل حساب حساب اختبار التعارض', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'تعديل الحساب الإشرافي', exact: true });
  await editor.locator('#dashboard-account-name').fill('مسودة محلية لم تضيع');
  await api(page, context, 'PUT', `/dashboard/accounts/${account.id}`, { ...account, name: 'تعديل مسؤول آخر' });
  await editor.getByRole('button', { name: 'حفظ', exact: true }).click();
  await expect(editor.getByText(/تغيّر الحساب لدى مسؤول آخر/)).toBeVisible();
  await expect(editor.locator('#dashboard-account-name')).toHaveValue('مسودة محلية لم تضيع');
  await editor.getByRole('button', { name: 'إلغاء', exact: true }).click();
  await page.getByRole('dialog', { name: 'إلغاء التعديلات؟', exact: true }).getByRole('button', { name: 'إلغاء التعديلات', exact: true }).click();
  await panel.getByRole('button', { name: 'تعديل حساب تعديل مسؤول آخر', exact: true }).click();
  await expect(editor.locator('#dashboard-account-name')).toHaveValue('تعديل مسؤول آخر');
  await editor.locator('#dashboard-account-name').fill('حساب بعد مراجعة التعارض');
  await editor.getByRole('button', { name: 'حفظ', exact: true }).click();
  await expect(editor).toBeHidden();
  await expect(panel.getByText('حساب بعد مراجعة التعارض', { exact: true })).toBeVisible();
});
