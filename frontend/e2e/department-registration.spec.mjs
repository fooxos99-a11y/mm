import { expect, test } from './support/isolatedTest.mjs';
import { rolePassword } from './support/credentials.mjs';
import { login, selectOption } from './support/gesture-helpers.mjs';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const apiOrigin = new URL(process.env.VUE_APP_API_BASE_URL).origin;
const headersFor = async (page, departmentId) => {
  const cookie = (await page.context().cookies(apiOrigin)).find(item => item.name === 'XSRF-TOKEN');
  return {
    Accept: 'application/json', Referer: page.url(), 'X-XSRF-TOKEN': decodeURIComponent(cookie?.value || ''),
    ...(departmentId ? { 'X-Department-Id': departmentId } : {}),
  };
};

test('copied links open each department form directly and submit only to that department', async ({ page }, info) => {
  const errors = [];
  const directoryRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (new URL(request.url()).pathname.endsWith('/public/departments')) directoryRequests.push(request.url());
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async value => { window.copiedRegistrationLink = value; },
    } });
  });
  await login(page, 'e2e-general-manager', rolePassword);
  const rootHeaders = await headersFor(page);
  const departments = [];
  for (const marker of ['A', 'B']) {
    const created = await page.request.post(`${apiOrigin}/api/management/departments`, {
      headers: rootHeaders, data: {
        name: `إدارة رابط ${marker}`, managerTitle: `مسؤول إدارة ${marker}`,
        managerLoginCode: `link-manager-${marker}`, managerPassword: rolePassword,
      },
    });
    expect(created.status(), await created.text()).toBe(201);
    const department = (await created.json()).department;
    departments.push({ id: department.id, marker });
    const headers = await headersFor(page, department.id);
    expect((await page.request.put(`${apiOrigin}/api/dashboard/registration/settings`, { headers, data: { isOpen: true } })).status()).toBe(204);
    expect((await page.request.put(`${apiOrigin}/api/dashboard/registration/fields`, {
      headers, data: { fields: [{ id: `field-${marker}`, label: `سؤال الإدارة ${marker}`, type: 'text', required: true }], fixedLabels: { name: `اسم متقدم ${marker}` } },
    })).status()).toBe(200);
  }
  for (const department of departments) {
    await page.goto('about:blank');
    await page.context().clearCookies();
    await login(page, `link-manager-${department.marker}`, rolePassword);
    await page.goto('dashboard?panel=settings&settingsItem=registration');
    await expect(page.locator('.registration-admin')).toBeVisible();
    await expect(page.getByRole('button', { name: 'إغلاق التسجيل', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'نسخ الرابط', exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.copiedRegistrationLink || '')).toContain(`departmentId=${department.id}`);
    department.url = await page.evaluate(() => window.copiedRegistrationLink);
    expect(new URL(department.url).pathname).toBe('/momars/registration');
  }
  expect(departments[0].url).not.toBe(departments[1].url);
  for (const department of departments) {
    // The first link must also win over the second manager's existing login session.
    await page.goto(department.url);
    await expect(page.locator('.registration-entry__form')).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'الإدارة', exact: true })).toHaveCount(0);
    await expect(page.getByText('اختر الإدارة لعرض نموذج التسجيل.')).toHaveCount(0);
    await expect(page.getByLabel(`سؤال الإدارة ${department.marker}`, { exact: true })).toBeVisible();
    const foreign = department.marker === 'A' ? 'B' : 'A';
    await expect(page.getByText(`سؤال الإدارة ${foreign}`, { exact: true })).toHaveCount(0);
    const directory = path.resolve('../.deploy/departments');
    mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: path.join(directory, `${info.project.name}-registration-link-${department.marker}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.getByLabel(`اسم متقدم ${department.marker}`, { exact: true }).fill(`متقدم خاص بالإدارة ${department.marker}`);
    await page.locator('#registration-phone').fill('0501234567');
    await page.locator('label[for="registration-gender"]').locator('..').locator('.v-field').click();
    await selectOption(page, 'ذكر', { exact: true });
    await page.getByLabel(`سؤال الإدارة ${department.marker}`, { exact: true }).fill(`إجابة ${department.marker}`);
    const submitted = page.waitForResponse(response => response.url().endsWith('/api/public/registration-requests') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'إرسال الطلب', exact: true }).click();
    const response = await submitted;
    expect(response.status(), await response.text()).toBe(201);
    expect(response.request().postDataJSON().departmentId).toBe(department.id);
    department.requestId = (await response.json()).id;
    await expect(page.locator('.registration-entry__state--success')).toBeVisible();
  }
  for (const department of departments) {
    await page.goto('about:blank');
    await page.context().clearCookies();
    await login(page, `link-manager-${department.marker}`, rolePassword);
    const response = await page.request.get(`${apiOrigin}/api/dashboard/registration`, { headers: await headersFor(page) });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.departmentId).toBe(department.id);
    expect(data.requests.map(request => request.id)).toEqual([department.requestId]);
  }
  expect(directoryRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('invalid registration links show an error without a department selector or another form', async ({ page }) => {
  for (const query of ['departmentId=0', 'departmentId=00000000-0000-0000-0000-000000000099', 'departmentId=a&departmentId=b']) {
    await page.goto(`registration?${query}`);
    await expect(page.locator('.registration-entry__state--error')).toBeVisible();
    await expect(page.locator('.registration-entry__form')).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: 'الإدارة', exact: true })).toHaveCount(0);
  }
});
