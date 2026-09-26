import { adminLogin, adminPassword, studentPassword } from './credentials.mjs';
export async function createStudentResultFixture(page, suffix) {
  await page.goto('login');
  await page.locator('[autocomplete="username"]').fill(adminLogin);
  await page.locator('[autocomplete="current-password"]').fill(adminPassword);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(url => url.pathname.endsWith('/dashboard'));
  const fixture = await page.evaluate(async ({ suffix, password }) => {
    const token = decodeURIComponent(document.cookie.split('; ').find(c => c.startsWith('XSRF-TOKEN='))?.slice(11) || '');
    const request = async (path, data) => {
      const response = await fetch(`/momars/api${path}`, {
        method: 'POST', credentials: 'include',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-XSRF-TOKEN': token },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`Fixture ${path}: ${response.status}`);
      return response.json();
    };
    const loginId = `88${suffix.padStart(8, '0')}`.slice(0, 10);
    const title = `Student results course ${suffix}`;
    await request('/students', { name: `Result student ${suffix}`, loginId, password, passwordConfirmation: password, branchId: 'male' });
    const course = await request('/dashboard/courses', { title, isActive: true });
    const question = await request(`/dashboard/courses/${course.id}/questions`, { assessmentType: 'pre', prompt: 'نتيجة اختبار الجوال', type: 'multiple', options: ['A', 'B'], allowFile: false, points: 1, correctAnswer: 'A' });
    await request('/dashboard/assessment-submissions', { courseId: course.id, assessmentType: 'pre', studentName: `Result student ${suffix}`, loginId, answers: [{ questionId: question.id, value: 'A' }] });
    return { loginId, title };
  }, { suffix, password: studentPassword });
  // Leave the dashboard first so late API responses cannot set a new session cookie.
  await page.goto('about:blank');
  await page.context().clearCookies();
  return fixture;
}
