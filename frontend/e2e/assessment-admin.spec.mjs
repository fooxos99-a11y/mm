import { expect, test } from './support/isolatedTest.mjs';
import { rolePassword } from './support/credentials.mjs';

const login = async (page) => {
  await page.goto('login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[autocomplete="username"]').fill('e2e-male-manager');
  await page.locator('input[autocomplete="current-password"]').fill(rolePassword);
  await Promise.all([
    page.waitForURL((url) => url.pathname.endsWith('/dashboard')),
    page.locator('form button[type="submit"]').click(),
  ]);
};

const expectNoOverflow = async (page) => {
  const dimensions = await page.evaluate(() => ({
    content: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
    viewport: window.innerWidth,
    offenders: [...document.querySelectorAll('body *')].map((element) => {
      const rect = element.getBoundingClientRect();
      return { tag: element.tagName, className: element.className, left: rect.left, right: rect.right, width: rect.width };
    }).filter((element) => element.left < -1 || element.right > window.innerWidth + 1).slice(0, 12),
  }));
  expect(dimensions.content, JSON.stringify(dimensions.offenders)).toBeLessThanOrEqual(dimensions.viewport + 1);
};

test('dashboard overview shows truthful indicator context', async ({ page }) => {
  await login(page);
  await expect(page.locator('.dashboard-indicator-card')).toHaveCount(6);
  await expect(page.locator('.dashboard-indicator-card__meta')).toHaveCount(6);
  await expectNoOverflow(page);
});

test('manager can add and save a task question from the plus menu', async ({ page }) => {
  await login(page);
  await page.goto('dashboard?panel=tasks');

  const taskSelect = page.locator('.assessment-select:visible').first();
  await taskSelect.locator('.v-field').click();
  await page.getByText('مهمة اختبار الواجهة', { exact: true }).click();

  await page.locator('.assessment-inline-builder__add:visible').click();
  await page.getByRole('button', { name: 'صح أو خطأ', exact: true }).click();
  const form = page.locator('.assessment-form-card--inline').last();
  await form.locator('input[placeholder="اكتب السؤال"]').fill('هل تعمل إضافة المهمة؟');
  await form.getByRole('button', { name: 'تحديد الخيار 1 إجابة صحيحة' }).click();
  await page.getByRole('button', { name: 'حفظ', exact: true }).click();

  await expect.poll(() => page.locator('input').evaluateAll(
    (inputs, expected) => inputs.some((input) => input.value === expected),
    'هل تعمل إضافة المهمة؟',
  )).toBe(true);
  const savedQuestion = page.locator('.assessment-form-card--inline').last();
  await expect(savedQuestion.getByRole('textbox', { name: 'الخيار 1 للسؤال 1' })).toHaveValue('صح');
  await expect(savedQuestion.getByRole('textbox', { name: 'الخيار 2 للسؤال 1' })).toHaveValue('خطأ');
  await expect(savedQuestion.getByRole('button', { name: 'تحديد الخيار 1 إجابة صحيحة' })).toHaveAttribute('aria-pressed', 'true');
  const readQuestionLayout = () => savedQuestion.evaluate((card) => {
    const field = card.querySelector('.assessment-input');
    const cardStyle = getComputedStyle(card);
    const fieldStyle = field ? getComputedStyle(field) : null;
    return {
      cardBorderWidth: Number.parseFloat(cardStyle.borderTopWidth),
      fieldBorderWidth: fieldStyle ? Number.parseFloat(fieldStyle.borderTopWidth) : 0,
      fieldHeight: field?.getBoundingClientRect().height ?? 0,
    };
  });
  await expect.poll(async () => (await readQuestionLayout()).cardBorderWidth).toBeGreaterThanOrEqual(1);
  await expect.poll(async () => (await readQuestionLayout()).fieldBorderWidth).toBeGreaterThanOrEqual(1);
  await expect.poll(async () => (await readQuestionLayout()).fieldHeight).toBeGreaterThanOrEqual(58);
  const pointsContainment = await savedQuestion.evaluate((card) => {
    const cardRect = card.getBoundingClientRect();
    const pointsRect = card.querySelector('.assessment-input--points')?.getBoundingClientRect();

    return {
      cardLeft: cardRect.left,
      cardRight: cardRect.right,
      pointsLeft: pointsRect?.left ?? -1,
      pointsRight: pointsRect?.right ?? Number.POSITIVE_INFINITY,
    };
  });
  expect(pointsContainment.pointsLeft, JSON.stringify(pointsContainment))
    .toBeGreaterThanOrEqual(pointsContainment.cardLeft - 1);
  expect(pointsContainment.pointsRight).toBeLessThanOrEqual(pointsContainment.cardRight + 1);
  await expectNoOverflow(page);
});

test('task start action opens its availability dialog', async ({ page }) => {
  await login(page);
  await page.goto('dashboard?panel=tasks');

  const taskSelect = page.locator('.assessment-select:visible').first();
  await taskSelect.locator('.v-field').click();
  await page.getByText('مهمة اختبار الواجهة', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'بدء المهمة الأدائية', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'بدء المهمة الأدائية', exact: true }).click();
  await expect(page.getByText('فتح المهام الأدائية', { exact: true })).toBeVisible();
  await expect(page.locator('#assessment-availability-minutes')).toBeVisible();
});

test('final exam question editor keeps the same clear assessment layout', async ({ page }) => {
  await login(page);
  await page.goto('dashboard?panel=finalexam');

  await page.locator('.assessment-inline-builder__add:visible').click();
  await page.getByRole('button', { name: 'خيارات', exact: true }).click();

  const card = page.locator('.final-exam-page .assessment-form-card--inline:visible').last();
  await expect(card.locator('input[placeholder="اكتب السؤال"]')).toBeVisible();
  const layout = await card.evaluate((element) => {
    const cardRect = element.getBoundingClientRect();
    const promptRect = element.querySelector('input[placeholder="اكتب السؤال"]')?.getBoundingClientRect();
    const pointsRect = element.querySelector('.assessment-input--points')?.getBoundingClientRect();
    const trashRect = element.querySelector('.assessment-form-card__trash')?.getBoundingClientRect();

    return {
      cardLeft: cardRect.left,
      cardRight: cardRect.right,
      promptTop: promptRect?.top ?? 0,
      promptBottom: promptRect?.bottom ?? 0,
      promptHeight: promptRect?.height ?? 0,
      pointsLeft: pointsRect?.left ?? -1,
      pointsRight: pointsRect?.right ?? Number.POSITIVE_INFINITY,
      pointsTop: pointsRect?.top ?? 0,
      pointsWidth: pointsRect?.width ?? 0,
      pointsHeight: pointsRect?.height ?? 0,
      trashLeft: trashRect?.left ?? -1,
      trashRight: trashRect?.right ?? Number.POSITIVE_INFINITY,
    };
  });

  expect(layout.pointsLeft).toBeGreaterThanOrEqual(layout.cardLeft - 1);
  expect(layout.pointsRight).toBeLessThanOrEqual(layout.cardRight + 1);
  expect(layout.trashLeft).toBeGreaterThanOrEqual(layout.cardLeft - 1);
  expect(layout.trashRight).toBeLessThanOrEqual(layout.cardRight + 1);
  expect(layout.promptHeight).toBeGreaterThanOrEqual(58);
  expect(layout.pointsHeight).toBeGreaterThanOrEqual(58);

  if ((page.viewportSize()?.width || 0) > 960) {
    expect(Math.abs(layout.promptTop - layout.pointsTop)).toBeLessThanOrEqual(1);
    expect(layout.pointsWidth).toBeGreaterThanOrEqual(138);
    expect(layout.pointsWidth).toBeLessThanOrEqual(142);
  } else {
    expect(layout.pointsTop).toBeGreaterThan(layout.promptBottom);
  }

  await expectNoOverflow(page);
});

test('course and task management actions stay inside the shared dropdown', async ({ page }) => {
  await login(page);
  await page.goto('dashboard?panel=tasks');

  const taskSelect = page.locator('.assessment-select:visible').first();
  await taskSelect.locator('.v-field').click();
  await expect(page.getByText('إضافة مهمة أدائية جديدة', { exact: true })).toBeVisible();
  await expect(page.locator('.assessment-course-menu:visible .assessment-select-option').last())
    .toContainText('إضافة مهمة أدائية جديدة');
  await expect(page.getByRole('button', { name: /تعديل اسم المهمة مهمة اختبار الواجهة/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /حذف المهمة مهمة اختبار الواجهة/ })).toBeVisible();
  const menuAlignment = await page.locator('.assessment-course-menu:visible').evaluate((menu) => {
    const actions = menu.querySelector('.assessment-select-option__actions');
    const reorderButtons = [...menu.querySelectorAll(
      '[aria-label^="رفع "], [aria-label^="خفض "]',
    )];
    const menuRect = menu.getBoundingClientRect();
    const actionsRect = actions?.getBoundingClientRect();

    return {
      actionsEdgeGap: actionsRect ? Math.round(actionsRect.left - menuRect.left) : null,
      reorderButtonsCount: reorderButtons.length,
    };
  });
  expect(menuAlignment.actionsEdgeGap).not.toBeNull();
  expect(menuAlignment.actionsEdgeGap).toBeLessThanOrEqual(24);
  expect(menuAlignment.reorderButtonsCount).toBe(0);
  await expectNoOverflow(page);
});
