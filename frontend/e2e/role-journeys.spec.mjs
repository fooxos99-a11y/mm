import { expect, test } from '@playwright/test';
import { rolePassword } from './support/credentials.mjs';

const password = rolePassword;

const roles = [
  {
    login: 'e2e-male-manager',
    path: '/momars/dashboard',
    root: '.dashboard-page',
    name: 'مشرف الاختبار',
  },
  {
    login: 'e2e-female-manager',
    path: '/momars/dashboard',
    root: '.dashboard-page',
    name: 'مشرفة الاختبار',
  },
  {
    login: 'e2e-reciter-role',
    path: '/momars/reciter',
    root: '.reciter-page',
    name: 'مقرئ الاختبار',
  },
  {
    login: 'e2e-student-role',
    path: '/momars/student',
    root: '.student-page',
    name: 'طالب الاختبار',
  },
  {
    login: 'e2e-trainee-role',
    path: '/momars/trainee',
    root: '.page-card',
    name: 'معلم الاختبار',
  },
];

const expectNoOverflow = async (page) => {
  const dimensions = await page.evaluate(() => ({
    content: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
    viewport: window.innerWidth,
  }));

  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
};

const login = async (page, account) => {
  await page.goto('login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[autocomplete="username"]').fill(account.login);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await Promise.all([
    page.waitForURL((url) => url.pathname === account.path),
    page.locator('form button[type="submit"]').click(),
  ]);
};

for (const account of roles) {
  test(`${account.login} can sign in and use its responsive home`, async ({ page }) => {
    const browserErrors = [];
    const serverErrors = [];

    page.on('pageerror', (error) => browserErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(message.text());
    });
    page.on('response', (response) => {
      if (response.status() >= 500) serverErrors.push(`${response.status()} ${response.url()}`);
    });

    await login(page, account);
    await expect(page.locator(account.root)).toBeVisible();
    await expectNoOverflow(page);

    if (account.path.endsWith('/dashboard')) {
      await expect(page.locator('.dashboard-topbar__name')).toContainText(account.name);
      await expect(page.locator('.dashboard-nav__item')).toHaveCount(11);
      await expect(page.locator('.dashboard-indicators-grid')).toBeVisible();
    }

    if (account.path.endsWith('/reciter')) {
      await expect(page.locator('.reciter-student-card')).toContainText('طالب الاختبار');
      await expect(page.locator('.reciter-part-circle')).toHaveCount(30);
    }

    if (account.path.endsWith('/student')) {
      await expect(page.locator('.dashboard-topbar')).toBeVisible();
      await expect(page.locator('.student-navigation')).toBeAttached();
      const menuButton = page.getByRole('button', { name: 'فتح القائمة' });
      if (page.viewportSize().width <= 1024) {
        await expect(menuButton).toBeVisible();
        await menuButton.click();
      }
      await page.getByRole('button', { name: 'المؤشرات', exact: true }).click();
      await expect(page.locator('.student-indicators-card')).toBeVisible();
      await expect(page.locator('.student-indicators-card .completion-panel__item')).toHaveCount(4);
    }

    if (['e2e-student-role', 'e2e-trainee-role'].includes(account.login)) {
      for (const route of ['courses/pre', 'tasks', 'final-exam']) {
        await page.goto(route);
        await expect(page.locator('.assessment-page')).toBeVisible();
        await expect(page.getByText('رقم الدخول', { exact: true })).toHaveCount(0);
        await expectNoOverflow(page);
      }
    }

    expect(browserErrors).toEqual([]);
    expect(serverErrors).toEqual([]);
  });
}

test('manager panels load without browser or server errors', async ({ page }) => {
  const browserErrors = [];
  const serverErrors = [];
  const account = roles[0];
  const panels = [
    ['courses', '.assessment-page'],
    ['tasks', '.tasks-page'],
    ['finalexam', '.final-exam-page'],
    ['satisfaction', '.satisfaction-admin'],
    ['users', '.people-page'],
    ['notifications', '.communications-page'],
    ['materials', '.admin-training-materials'],
    ['results', '.results-view'],
    ['completion', '.completion-page'],
  ];

  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 500) serverErrors.push(`${response.status()} ${response.url()}`);
  });

  await login(page, account);

  for (const [panel, selector] of panels) {
    await page.goto(`dashboard?panel=${panel}`);
    await expect(page.locator(selector)).toBeVisible();
    await expectNoOverflow(page);

    if (panel === 'courses') {
      const courseSelect = page.locator('.assessment-select:visible').first();
      await courseSelect.locator('.v-field').click();
      await page.getByText('دورة اختبار الواجهة', { exact: true }).click();
      await expect(courseSelect).toContainText('دورة اختبار الواجهة');
    }

    if (panel === 'tasks') {
      const taskSelect = page.locator('.assessment-select:visible');
      await taskSelect.locator('.v-field').click();
      await page.getByText('مهمة اختبار الواجهة', { exact: true }).click();
      await expect(taskSelect).toContainText('مهمة اختبار الواجهة');
    }

    if (panel === 'finalexam') {
      await page.locator('.assessment-inline-builder__add:visible').click();
      await page.getByRole('button', { name: 'خيارات', exact: true }).click();
      await expect(page.locator('.assessment-form-card--inline:visible:not(.assessment-inline-list__item)')).toHaveCount(1);
    }
  }

  await page.goto('dashboard?panel=settings&settingsItem=registration');
  await expect(page.locator('.registration-admin')).toBeVisible();
  await expectNoOverflow(page);

  expect(browserErrors).toEqual([]);
  expect(serverErrors).toEqual([]);
});
