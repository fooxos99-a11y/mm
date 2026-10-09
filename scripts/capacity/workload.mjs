import { performance } from 'node:perf_hooks';
import { buildAssessmentSubmissionFormData } from '../../frontend/src/services/multipartPayload.mjs';

const percentile = (values, fraction) => {
  const sorted = values.toSorted((a, b) => a - b);
  return Math.round(sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)] || 0);
};

export const summarize = samples => ({
  requests: samples.length,
  failed: samples.filter(sample => !sample.ok).length,
  statusCounts: samples.reduce((counts, sample) => ({ ...counts, [sample.status]: (counts[sample.status] || 0) + 1 }), {}),
  p50Ms: percentile(samples.filter(sample => sample.status !== 'skipped').map(sample => sample.ms), 0.5),
  p95Ms: percentile(samples.filter(sample => sample.status !== 'skipped').map(sample => sample.ms), 0.95),
  maxMs: percentile(samples.filter(sample => sample.status !== 'skipped').map(sample => sample.ms), 1),
});

class StudentSession {
  constructor(base, index, password) {
    this.base = base;
    this.login = `capacity-${String(index).padStart(5, '0')}`;
    this.name = `Capacity student ${index}`;
    this.branchCode = index % 2 ? 'female' : 'male';
    this.password = password;
    this.cookies = new Map();
  }

  async request(route, { method = 'GET', data, expected = 200, csrf = true } = {}) {
    const start = performance.now();
    const multipart = data instanceof FormData;
    try {
      const response = await fetch(`${this.base}${route}`, {
        method, redirect: 'error', signal: AbortSignal.timeout(30_000),
        headers: { Accept: 'application/json', Referer: `${this.base}/`, Origin: this.base,
          Cookie: [...this.cookies].map(([name, value]) => `${name}=${value}`).join('; '),
          ...(data ? { ...(!multipart ? { 'Content-Type': 'application/json' } : {}),
            ...(csrf ? { 'X-XSRF-TOKEN': decodeURIComponent(this.cookies.get('XSRF-TOKEN') || '') } : {}) } : {}),
        },
        ...(data ? { body: multipart ? data : JSON.stringify(data) } : {}),
      });
      for (const cookie of response.headers.getSetCookie()) {
        const pair = cookie.split(';', 1)[0];
        const equals = pair.indexOf('=');
        this.cookies.set(pair.slice(0, equals), pair.slice(equals + 1));
      }
      const text = await response.text();
      let body;
      try { body = JSON.parse(text); } catch { body = null; }
      return { status: response.status, ok: response.status === expected, ms: performance.now() - start, body };
    } catch (error) {
      return { status: error.name === 'TimeoutError' ? 'timeout' : 'network', ok: false, ms: performance.now() - start, body: null };
    }
  }
}

const submissionEndpoint = course => course.assessmentType === 'final'
  ? '/api/public/final-exam/submissions' : '/api/public/assessment-submissions';
const submissionPayload = (session, course, login = session.login) => {
  const final = course.assessmentType === 'final';
  const questionIds = final ? course.branchQuestionIds[session.branchCode] : course.questionIds;
  return buildAssessmentSubmissionFormData({
    ...(final ? { branchCode: session.branchCode, loginCode: login }
      : { courseId: course.courseId, assessmentType: course.assessmentType || 'pre', loginId: login }),
    studentName: session.name, answers: questionIds.map(questionId => ({ questionId, value: 'أ' })),
  }, final ? ['branchCode', 'loginCode', 'studentName'] : ['courseId', 'assessmentType', 'loginId', 'studentName']);
};

export async function validateGuards({ base, index, password, course }) {
  const session = new StudentSession(base, index, password);
  const checks = {};
  checks.unauthenticated = await session.request('/api/dashboard/snapshot', { expected: 401 });
  checks.csrfCookie = await session.request('/sanctum/csrf-cookie', { expected: 204 });
  checks.login = await session.request('/api/auth/login', { method: 'POST', data: { login_code: session.login, password } });
  const payload = loginId => submissionPayload(session, course, loginId);
  const endpoint = submissionEndpoint(course);
  checks.missingCsrf = await session.request(endpoint, { method: 'POST', data: payload(session.login), csrf: false, expected: 419 });
  checks.anotherIdentity = await session.request(endpoint, { method: 'POST', data: payload('capacity-00000'), expected: 422 });
  checks.validSubmission = await session.request(endpoint, { method: 'POST', data: payload(session.login), expected: 201 });
  checks.duplicateSubmission = await session.request(endpoint, { method: 'POST', data: payload(session.login), expected: 422 });
  // Response bodies contain personal/session details and are deliberately excluded.
  return Object.fromEntries(Object.entries(checks).map(([name, sample]) => [name,
    { ok: sample.ok, status: sample.status, ms: Math.round(sample.ms) }]));
}

export async function validateConcurrentRetry({ base, index, password, course }) {
  const sessions = [new StudentSession(base, index, password), new StudentSession(base, index, password)];
  for (const session of sessions) {
    const csrf = await session.request('/sanctum/csrf-cookie', { expected: 204 });
    const login = await session.request('/api/auth/login', { method: 'POST', data: { login_code: session.login, password } });
    if (!csrf.ok || !login.ok) throw new Error('Concurrent-retry login failed.');
  }
  const attempts = await Promise.all(sessions.map(session => session.request(submissionEndpoint(course), {
    method: 'POST', expected: 201, data: submissionPayload(session, course),
  })));
  const statuses = attempts.map(attempt => attempt.status).sort();
  return { ok: statuses[0] === 201 && statuses[1] === 422, statuses };
}

// Each phase starts all participants together, without think time or automatic retries.
export async function runWave({ base, count, offset, password, course, verify }) {
  const sessions = Array.from({ length: count }, (_, index) => new StudentSession(base, offset + index, password));
  const phases = {};
  const begin = performance.now();
  const csrf = await Promise.all(sessions.map(session => session.request('/sanctum/csrf-cookie', { expected: 204 })));
  phases.csrf = summarize(csrf);
  const login = await Promise.all(sessions.map((session, index) => csrf[index].ok
    ? session.request('/api/auth/login', { method: 'POST', data: { login_code: session.login, password } })
    : Promise.resolve({ ok: false, status: 'skipped', ms: 0 })));
  phases.login = summarize(login);
  const open = await Promise.all(sessions.map((session, index) => login[index].ok
    ? session.request('/api/dashboard/snapshot') : Promise.resolve({ ok: false, status: 'skipped', ms: 0 })));
  for (const sample of open) {
    const field = { pre: 'preQuestions', post: 'postQuestions', tasks: 'taskQuestions' }[course.assessmentType || 'pre'];
    const questionCount = course.assessmentType === 'final' ? sample.body?.finalExamQuestions?.length
      : sample.body?.courses?.find(item => item.id === course.courseId)?.[field]?.length;
    if (sample.ok && questionCount !== 20) sample.ok = false;
  }
  phases.openExam = summarize(open);
  const submit = await Promise.all(sessions.map((session, index) => open[index].ok
    ? session.request(submissionEndpoint(course), { method: 'POST', expected: 201, data: submissionPayload(session, course) })
    : Promise.resolve({ ok: false, status: 'skipped', ms: 0 })));
  phases.submitExam = summarize(submit);
  const after = await Promise.all(sessions.map((session, index) => submit[index].ok
    ? session.request('/api/dashboard/snapshot') : Promise.resolve({ ok: false, status: 'skipped', ms: 0 })));
  for (let index = 0; index < after.length; index++) {
    const collection = course.assessmentType === 'final' ? 'finalExamSubmissions' : 'submissions';
    const saved = after[index].body?.[collection]?.find(item => item.id === submit[index].body?.id);
    if (after[index].ok && saved?.answers?.length !== 20) after[index].ok = false;
  }
  phases.results = summarize(after);
  const successful = submit.filter(sample => sample.ok).length;
  const persisted = verify();
  const failures = Object.values(phases).reduce((total, phase) => total + phase.failed, 0);
  return { concurrentStudents: count, completed: successful, durationMs: Math.round(performance.now() - begin),
    phases, persisted,
    acceptable: failures === 0 && phases.login.p95Ms <= 3000 && phases.openExam.p95Ms <= 2000
      && phases.submitExam.p95Ms <= 3000 && phases.results.p95Ms <= 2000
      && persisted.duplicates === 0 && persisted.incomplete === 0,
  };
}
