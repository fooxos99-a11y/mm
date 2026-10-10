import { expect, test } from './support/isolatedTest.mjs';
import { login } from './support/gesture-helpers.mjs';

const warning = 'ستُحذف الأسئلة والإجابات والنتائج والمرفقات المرتبطة نهائيًا. لا يمكن التراجع.';
const cases = [
  { panel: 'courses', type: 'course', assessment: 'pre' },
  { panel: 'courses', type: 'course', assessment: 'post' },
  { panel: 'tasks', type: 'task', mode: 'questions' },
  { panel: 'tasks', type: 'task', mode: 'document' },
];

for (const scenario of cases) {
  const label = [scenario.panel, scenario.assessment || scenario.type, scenario.mode].filter(Boolean).join(' ');
  test(`delete answered ${label} permanently through the UI`, async ({ page, context }, info) => {
    await login(page);
    const origin = new URL(process.env.VUE_APP_API_BASE_URL).origin;
    const api = async (method, route, data) => {
      const cookie = (await context.cookies(origin)).find(item => item.name === 'XSRF-TOKEN');
      const response = await page.request.fetch(`${origin}/api/dashboard/${route}`, { method, data,
        headers: { Accept: 'application/json', Referer: page.url(), 'X-XSRF-TOKEN': decodeURIComponent(cookie?.value || '') } });
      expect(response.ok(), `${route}: ${response.status()} ${await response.text()}`).toBeTruthy();
      return response.status() === 204 ? null : response.json();
    };
    const title = `حذف شامل ${label} ${info.project.name}`;
    const course = await api('POST', 'courses', { title, entityType: scenario.type, taskMode: scenario.mode, isActive: false });
    const other = await api('POST', 'courses', { title: `دورة محفوظة ${info.project.name}`, isActive: false });
    const submissions = [];
    for (const assessment of scenario.type === 'course' ? ['pre', 'post'] : ['tasks']) {
      const question = scenario.mode === 'document'
        ? (await api('GET', 'snapshot')).courses.find(item => item.id === course.id).taskQuestions[0]
        : await api('POST', `courses/${course.id}/questions`, {
          assessmentType: assessment, prompt: 'سؤال له إجابة محفوظة', type: 'text', options: [], allowFile: false, points: 2, correctAnswer: '',
        });
      if (assessment === 'tasks') await api('PUT', `courses/${course.id}`, { isTasksEnabled: true });
      submissions.push(await api('POST', 'assessment-submissions', {
        courseId: course.id, assessmentType: assessment, studentName: 'طالب تجربة الحذف',
        loginId: `deletion-${assessment}-${info.project.name}`, answers: [{ questionId: question.id, value: 'إجابة محفوظة' }],
      }));
    }
    const route = `dashboard?panel=${scenario.panel}&courseId=${course.id}&assessmentType=${scenario.assessment || 'tasks'}`;
    const openDelete = async () => {
      await page.goto(route);
      await page.locator('.assessment-select:visible').first().locator('.v-field').click();
      await page.getByRole('button', { name: `حذف ${scenario.type === 'task' ? 'المهمة' : 'الدورة'} ${title}`, exact: true }).click();
      const dialog = page.getByRole('dialog').filter({ hasText: warning });
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText(title);
      const width = await dialog.evaluate(element => ({ content: element.scrollWidth, viewport: innerWidth }));
      expect(width.content).toBeLessThanOrEqual(width.viewport + 1);
      return dialog;
    };
    const cancel = await openDelete();
    await cancel.getByRole('button', { name: 'إلغاء', exact: true }).click();
    await expect(cancel).not.toBeVisible();
    const before = await api('GET', 'snapshot');
    expect(before.courses.some(item => item.id === course.id)).toBe(true);
    for (const submission of submissions) {
      expect(before.submissions.find(item => item.id === submission.id).answers[0].value).toBe('إجابة محفوظة');
    }
    const confirm = await openDelete();
    const deletion = page.waitForResponse(response => response.request().method() === 'DELETE'
      && response.url().endsWith(`/courses/${course.id}`));
    await confirm.getByRole('button', { name: 'حذف', exact: true }).click();
    expect((await deletion).status()).toBe(204);
    await expect(confirm).not.toBeVisible();
    await page.reload();
    const after = await api('GET', 'snapshot');
    expect(after.courses.some(item => item.id === course.id)).toBe(false);
    expect(after.submissions.some(item => item.courseId === course.id)).toBe(false);
    expect(after.courses.some(item => item.id === other.id)).toBe(true);
    const width = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
    expect(width.content).toBeLessThanOrEqual(width.viewport + 1);
  });
}
