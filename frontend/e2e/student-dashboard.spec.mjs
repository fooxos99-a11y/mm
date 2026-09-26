import { expect, test } from '@playwright/test';
import { createStudentResultFixture } from './support/studentResultFixture.mjs';
import { studentPassword } from './support/credentials.mjs';

test('student results remain usable across the responsive viewport matrix', async ({ page }, testInfo) => {
  const suffix = testInfo.project.name.replace(/\D/g, '') || '1440';
  const { loginId, title } = await createStudentResultFixture(page, suffix);

  await page.goto('login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[autocomplete="username"]').fill(loginId);
  await page.locator('input[autocomplete="current-password"]').fill(studentPassword);

  await Promise.all([
    page.waitForURL((url) => url.pathname === '/momars/student', { timeout: 90_000 }),
    page.locator('form button[type="submit"]').click(),
  ]);

  await expect(page.locator('.student-page')).toBeVisible();
  // The fixture submits the pre-test for this course, not the first seeded course.
  await page.locator('.student-overview-filter .v-field').click();
  await page.getByRole('option', { name: title, exact: true }).click();
  await expect(page.locator('.student-course-section')).toHaveCount(3);

  const preview = page.locator('.student-course-section .results-entry__preview').first();
  await expect(preview).toBeEnabled();
  const box = await preview.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);
  await preview.click();
  await expect(page.locator('.student-detail-stack')).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    width: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
    viewport: window.innerWidth,
  }));
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport + 1);

});
