import { trainingPdfFixture } from './support/trainingPdfFixture.mjs';
import { expect, test } from './support/isolatedTest.mjs';
import { adminLogin, adminPassword } from './support/credentials.mjs';
import { selectOption } from './support/gesture-helpers.mjs';

test('PDF fits width without added controls, fetches ranges on demand and keeps original download', async ({ page }, info) => {
  const file = trainingPdfFixture();
  await page.goto('login');
  await page.locator('input[autocomplete="username"]').fill(adminLogin);
  await page.locator('input[autocomplete="current-password"]').fill(adminPassword);
  await Promise.all([page.waitForURL((url) => url.pathname === '/momars/dashboard'), page.locator('form button[type="submit"]').click()]);
  await page.goto('dashboard?panel=materials');
  await page.getByLabel('المادة التدريبية', { exact: true }).locator('xpath=ancestor::div[contains(@class,"v-input")]').locator('.v-field').click();
  await selectOption(page, 'إضافة مادة');
  const dialog = page.locator('.admin-training-materials__dialog');
  await dialog.locator('.admin-training-materials__input').first().fill('دليل التدريب المتدرج');
  await page.locator('.admin-training-materials__hidden-file-input').setInputFiles({ name: 'progressive.pdf', mimeType: 'application/pdf', buffer: file });
  const saved = page.waitForResponse((response) => response.url().includes('/dashboard/training-materials') && response.request().method() === 'POST');
  await dialog.getByRole('button', { name: 'إضافة المادة', exact: true }).click();
  const savedResponse = await saved;
  expect(savedResponse.status(), await savedResponse.text()).toBe(201);
  await expect(dialog).not.toBeVisible();
  const ranges = [];
  let transferred = 0;
  page.on('response', (response) => {
    if (response.url().includes('/training-material-attachments/') && response.request().method() === 'GET') {
      ranges.push({ range: response.request().headers().range, status: response.status() });
      transferred += Number(response.headers()['content-length'] || 0);
    }
  });
  await page.getByRole('button', { name: 'progressive', exact: true }).click();
  const viewer = page.locator('.training-pdf');
  const first = viewer.locator('.training-pdf-page').first();
  await expect(first).toHaveAttribute('aria-busy', 'false');
  await expect(first.locator('.training-pdf-text')).toContainText('Training page 1');
  await expect(viewer.getByRole('button')).toHaveCount(0);
  const scroller = viewer.locator('.training-pdf__scroller');
  expect(await scroller.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  expect(ranges.length).toBeGreaterThan(0);
  expect(ranges.every((entry) => entry.status === 206 && entry.range)).toBe(true);
  expect(transferred).toBeLessThan(file.length / 2);
  const initialTransferred = transferred;
  await page.screenshot({ path: info.outputPath('pdf-fit-width.png'), fullPage: true });
  await scroller.evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await expect(viewer.locator('.training-pdf-page').last()).toHaveAttribute('aria-busy', 'false');
  expect(transferred).toBeGreaterThan(initialTransferred);
  await info.attach('pdf-network.json', { body: Buffer.from(JSON.stringify({ fileBytes: file.length, bytesAtFirstPage: initialTransferred, bytesAfterScrolling: transferred, allRequestsPartial: ranges.every((entry) => entry.status === 206 && entry.range) })), contentType: 'application/json' });
  await expect(first).toHaveAttribute('aria-busy', 'true');
  await scroller.evaluate((el) => { el.scrollTop = 0; });
  await expect(first).toHaveAttribute('aria-busy', 'false');
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'تنزيل الملف', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('progressive.pdf');
  await page.getByRole('button', { name: 'إغلاق', exact: true }).click();
  await expect(viewer).not.toBeVisible();
  let interrupted = false;
  await page.route('**/training-material-attachments/**', (route) => {
    if (!interrupted && route.request().headers().range) {
      interrupted = true;
      return route.fulfill({ status: 503, body: 'temporarily unavailable' });
    }
    return route.continue();
  });
  await page.getByRole('button', { name: 'progressive', exact: true }).click();
  await expect(viewer.getByRole('alert')).toContainText('تعذر عرض المستند');
  await expect(viewer.getByRole('button')).toHaveCount(0);
  await page.getByRole('button', { name: 'إغلاق', exact: true }).click();
  await expect(viewer).not.toBeVisible();
  await page.getByRole('button', { name: 'progressive', exact: true }).click();
  await expect(first).toHaveAttribute('aria-busy', 'false');
});
