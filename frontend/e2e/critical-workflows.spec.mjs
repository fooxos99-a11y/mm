import { expect, test } from '@playwright/test';
import { adminLogin, adminPassword, studentPassword } from './support/credentials.mjs';


test('admin critical data workflows persist through the browser API session', async ({ page }, testInfo) => {
  await page.goto('login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[autocomplete="username"]').fill(adminLogin);
  await page.locator('input[autocomplete="current-password"]').fill(adminPassword);
  await Promise.all([
    page.waitForURL((url) => url.pathname === '/momars/dashboard'),
    page.locator('form button[type="submit"]').click(),
  ]);

  const suffix = testInfo.project.name.replace(/\D/g, '') || '1440';
  const result = await page.evaluate(async ({ suffix, password }) => {
    const token = document.cookie
      .split('; ')
      .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
      ?.slice('XSRF-TOKEN='.length);
    const request = async (path, options = {}) => {
      const response = await fetch(`/momars/api${path}`, {
        credentials: 'include',
        ...options,
        headers: {
          Accept: 'application/json',
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          'X-XSRF-TOKEN': decodeURIComponent(token || ''),
          ...(options.headers || {}),
        },
      });
      const contentType = response.headers.get('content-type') || '';
      return {
        status: response.status,
        contentType,
        data: contentType.includes('application/json') ? await response.json() : null,
        blobSize: contentType.includes('application/zip') ? (await response.blob()).size : 0,
      };
    };

    const loginId = `77${suffix.padStart(8, '0')}`.slice(0, 10);
    const student = await request('/students', {
      method: 'POST',
      body: JSON.stringify({
        name: `E2E Student ${suffix}`,
        loginId,
        password,
        passwordConfirmation: password,
        branchId: 'male',
      }),
    });
    const course = await request('/dashboard/courses', {
      method: 'POST',
      body: JSON.stringify({ title: `E2E Course ${suffix}`, isActive: true }),
    });
    const question = await request(`/dashboard/courses/${course.data?.id}/questions`, {
      method: 'POST',
      body: JSON.stringify({
        assessmentType: 'pre',
        prompt: 'E2E pre question',
        type: 'multiple',
        options: ['A', 'B'],
        allowFile: false,
        points: 1,
        correctAnswer: 'A',
      }),
    });
    const assessment = await request('/dashboard/assessment-submissions', {
      method: 'POST',
      body: JSON.stringify({
        courseId: course.data?.id,
        assessmentType: 'pre',
        studentName: `E2E Student ${suffix}`,
        loginId,
        answers: [{ questionId: question.data?.id, value: 'A' }],
      }),
    });
    const finalQuestion = await request('/dashboard/final-exam/questions', {
      method: 'POST',
      body: JSON.stringify({
        branchCode: 'male',
        prompt: 'E2E final question',
        type: 'multiple',
        options: ['A', 'B'],
        allowFile: false,
        points: 2,
        correctAnswer: 'B',
      }),
    });
    const finalSetting = await request('/dashboard/final-exam/settings/male', {
      method: 'PUT',
      body: JSON.stringify({
        isEnabled: true,
        closesAt: '2030-12-31T21:00:00.000Z',
        notificationTemplate: 'E2E final exam is open',
      }),
    });
    const permission = await request('/dashboard/role-permissions', {
      method: 'PUT',
      body: JSON.stringify({ role: 'male_manager', key: 'page_results', isEnabled: true }),
    });
    const removedBackup = await request('/dashboard/backup/export');
    const removedActivityLog = await request('/dashboard/activity-logs');
    const snapshot = await request('/dashboard/snapshot');

    return {
      loginId,
      statuses: {
        student: student.status,
        course: course.status,
        question: question.status,
        assessment: assessment.status,
        finalQuestion: finalQuestion.status,
        finalSetting: finalSetting.status,
        permission: permission.status,
        removedBackup: removedBackup.status,
        removedActivityLog: removedActivityLog.status,
        snapshot: snapshot.status,
      },
      coursePersisted: snapshot.data?.courses?.some((item) => item.id === course.data?.id),
      assessmentPersisted: snapshot.data?.submissions?.some((item) => item.id === assessment.data?.id),
      finalPersisted: snapshot.data?.finalExamQuestions?.some((item) => item.id === finalQuestion.data?.id)
        && snapshot.data?.finalExamSettings?.male?.isEnabled === true,
      permissionPersisted: snapshot.data?.rolePermissions?.male_manager?.page_results === true,
    };
  }, { suffix, password: studentPassword });

  expect(result.statuses).toEqual({
    student: 201,
    course: 201,
    question: 201,
    assessment: 201,
    finalQuestion: 201,
    finalSetting: 204,
    permission: 204,
    removedBackup: 404,
    removedActivityLog: 404,
    snapshot: 200,
  });
  expect(result.coursePersisted).toBe(true);
  expect(result.assessmentPersisted).toBe(true);
  expect(result.finalPersisted).toBe(true);
  expect(result.permissionPersisted).toBe(true);

  await page.context().clearCookies();
  await page.goto('login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[autocomplete="username"]').fill(result.loginId);
  await page.locator('input[autocomplete="current-password"]').fill(studentPassword);
  await Promise.all([
    page.waitForURL((url) => url.pathname === '/momars/student'),
    page.locator('form button[type="submit"]').click(),
  ]);
  await page.goto('final-exam', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.final-exam-public')).toBeVisible();
  await expect(page.getByText('رقم الدخول', { exact: true })).toHaveCount(0);
  const option = page.locator('.assessment-option').first();
  await expect(option).toBeVisible();
  expect((await option.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  const dimensions = await page.evaluate(() => ({
    width: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
    viewport: window.innerWidth,
  }));
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport + 1);
});
