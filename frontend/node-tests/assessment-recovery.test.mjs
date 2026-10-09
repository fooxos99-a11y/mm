import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { acknowledgeSubmission, hasQuestionAnswer, recoverSavedSubmission } from '../src/features/assessmentQuestions/submissionState.mjs';

const loadMethods = async (path, dependencies = '') => {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const withoutImports = source.replace(/^import[\s\S]*?;\r?\n/gm, '');
  const shared = `const acknowledgeSubmission = ${acknowledgeSubmission};\nconst hasQuestionAnswer = ${hasQuestionAnswer};\nconst recoverSavedSubmission = ${recoverSavedSubmission};\n`;
  const module = await import(`data:text/javascript;base64,${Buffer.from(shared + dependencies + withoutImports).toString('base64')}`);
  return module.default || module.finalExamQuestionMethods;
};
const courseMethods = await loadMethods('../src/features/course/courseSubmissionMethods.js');
const finalMethods = await loadMethods('../src/features/finalExam/publicFinalExamSubmissionMethods.js',
  'const submitPublicFinalExam = async () => ({ id: "saved", submittedAt: "now" });\n');
const tasksMethods = await loadMethods('../src/features/tasks/tasksAnswerMethods.js',
  'const submitPublicAssessment = async () => ({ id: "saved", submittedAt: "now" });\n');

test('acknowledging a submission replaces its old copy and respects file permissions', () => {
  const snapshot = { submissions: [{ id: 'keep' }, { id: 'saved', answers: [] }], other: [1] };
  const result = acknowledgeSubmission(snapshot, 'submissions', { id: 'saved' }, { answers: ['complete'] });
  assert.deepEqual(result.submissions, [{ id: 'keep' }, { id: 'saved', answers: ['complete'] }]);
  assert.equal(snapshot.submissions[1].answers.length, 0);
  assert.equal(result.other, snapshot.other);
  assert.deepEqual(acknowledgeSubmission(null, 'submissions', { id: 'saved' }, {}).submissions, [{ id: 'saved' }]);
  assert.equal(hasQuestionAnswer({ id: 'q', type: 'text', allowFile: true }, {}, { q: { file: {} } }), true);
  assert.equal(hasQuestionAnswer({ id: 'q', type: 'text', allowFile: false }, {}, { q: { file: {} } }), false);
  assert.equal(hasQuestionAnswer({ id: 'q', type: 'multiple', allowFile: true }, {}, { q: { file: {} } }), false);
  assert.equal(hasQuestionAnswer({ id: 'q' }, { q: 'text' }, {}), true);
});

test('a file-only answer is complete only when the question permits attachments', () => {
  const context = { activeCourse: { id: 'course' }, isAssessmentEnabled: true, student: {},
    existingSubmission: null, questions: [{ id: 'q', type: 'text', allowFile: true }], answers: {}, files: { q: { file: {} } } };
  assert.equal(courseMethods.getSubmissionBlockReason.call(context), '');
  context.questions[0].allowFile = false;
  assert.equal(courseMethods.getSubmissionBlockReason.call(context), 'الرجاء إكمال جميع الأسئلة');
});

test('recovery confirms saved data and tolerates unavailable or unrelated results', async () => {
  const saved = { submissions: [{ id: 'saved' }] };
  assert.equal(await recoverSavedSubmission(async () => saved, snapshot => snapshot.submissions.length > 0), saved);
  assert.equal(await recoverSavedSubmission(async () => saved, () => false), null);
  assert.equal(await recoverSavedSubmission(async () => { throw new Error('offline'); }, () => true), null);
});

test('a saved post exam remains acknowledged when its satisfaction request fails', async () => {
  const context = { ...courseMethods, activeCourse: { id: 'course' }, resolvedAssessmentType: 'post',
    student: { loginId: '100' }, isAssessmentEnabled: true, existingSubmission: null,
    hasPendingPostSatisfaction: true, questions: [{ id: 'q' }], answers: { q: 'answer' },
    files: {}, satisfactionAnswers: { rating: { ratingValue: 8 } }, satisfactionQuestions: [{ id: 'rating' }],
    alreadySubmittedSatisfaction: false, publicSnapshot: { submissions: [] },
    validateSatisfactionAnswers: () => true, resetKey: 0,
    submitAssessmentAnswers: async () => ({ id: 'saved', submittedAt: 'now' }),
    submitSatisfactionAnswers: async () => { throw new Error('survey unavailable'); },
    fetchPublicSnapshotWithTimeout: async () => { throw new Error('offline'); } };
  await context.handleSubmit();
  assert.equal(context.publicSnapshot.submissions[0]?.id, 'saved');
  assert.equal(context.satisfactionAnswers.rating.ratingValue, 8);
  assert.equal(context.pageError, 'survey unavailable');
  assert.equal(context.submitting, false);
});

for (const [type, methods] of [['final', finalMethods], ['tasks', tasksMethods]]) {
  test(`${type} success remains visible when refreshing results fails`, async () => {
    const context = { ...methods, student: { loginId: '100', name: 'Student' }, isEnabled: true,
      taskIsEnabled: true, selectedTask: { id: 'task', taskMode: 'questions' }, existingSubmission: null,
      questions: [{ id: 'q' }], taskQuestions: [{ id: 'q' }], answers: { q: 'answer' }, files: {},
      publicSnapshot: { submissions: [], finalExamSubmissions: [] }, branchCode: 'male', resetKey: 0,
      fetchPublicSnapshotWithTimeout: async () => { throw new Error('offline'); },
      buildSubmissionAnswers: async () => [{ questionId: 'q', value: 'answer' }] };
    await context.handleSubmit();
    const saved = context.publicSnapshot[type === 'final' ? 'finalExamSubmissions' : 'submissions'];
    assert.equal(saved[0]?.id, 'saved');
    assert.equal(context.pageError, '');
    assert.equal(context.submitting, false);
  });
}

const finalQuestionMethods = await loadMethods('../src/features/finalExam/finalExamQuestionMethods.js',
  'const hasQuestionDraftChanges = () => false;\n');
for (const method of ['handleSaveAllQuestions', 'submitQuestions']) {
  test(`${method} retries only final questions whose previous save failed`, async () => {
    const saved = [];
    let failSecond = true;
    const forms = ['one', 'two'].map(prompt => ({ prompt, type: 'text', options: [], points: '1', correctAnswer: '' }));
    const context = { ...finalQuestionMethods, questionForms: forms, questionErrors: ['', ''], selectedBranch: 'female',
      visibleBranchQuestions: [], questionDrafts: {}, questionDraftErrors: {}, pendingDeletedQuestionIds: [],
      validateQuestionDraft: () => '', $toast: { success() {}, error() {} },
      handleCreateQuestionDialogChange() { this.questionForms = []; },
      addFinalExamQuestion: async ({ prompt }) => {
        if (prompt === 'two' && failSecond) { failSecond = false; throw new Error('second save failed'); }
        saved.push(prompt);
      } };
    await context[method]();
    assert.deepEqual(saved, ['one']);
    assert.deepEqual(context.questionForms.map(form => form.prompt), ['two']);
    await context[method]();
    assert.deepEqual(saved, ['one', 'two']);
    assert.deepEqual(context.questionForms, []);
  });
}

for (const switchAccount of [false, true]) {
  test(`separate survey acknowledges accepted responses with account switch=${switchAccount}`, async () => {
    const store = { state: { authGeneration: 1, dashboardSnapshot: { satisfactionResponses: [] } },
      commit(name, snapshot) { assert.equal(name, 'setDashboardSnapshot'); this.state.dashboardSnapshot = snapshot; } };
    const key = `momarsSurveySave${switchAccount}`;
    globalThis[key] = async () => {
      if (switchAccount) store.state.authGeneration++;
      return [{ id: 'saved', courseId: 'course', questionId: 'q', loginCode: '100' }];
    };
    try {
      const controller = await loadMethods('../src/features/controllers/SatisfactionView.js',
        `const mapActions = () => ({}); const mapState = () => ({}); const AppButton = {};\n`
        + `const submitPublicSatisfactionResponses = responses => globalThis['${key}'](responses);\n`);
      const context = { ...controller.methods, $store: store, activeCourse: { id: 'course' },
        student: { loginId: '100', name: 'Student' }, hasPostSubmission: true,
        satisfactionQuestions: [{ id: 'q', type: 'rating', isRequired: true }], answers: { q: { ratingValue: 1 } },
        validateAnswers: () => true, loadDashboardSnapshot: async () => { throw new Error('offline'); } };
      await context.handleSubmit();
      assert.equal(store.state.dashboardSnapshot.satisfactionResponses.length, switchAccount ? 0 : 1);
      assert.equal(context.pageError || '', '');
      assert.equal(context.submitting, false);
    } finally {
      delete globalThis[key];
    }
  });
}

test('registration editing waits for pending data and avoids a second read', async () => {
  let resolve;
  let requests = 0;
  const key = 'momarsPendingRegistration';
  const pending = new Promise(done => { resolve = done; });
  globalThis[key] = () => { requests++; return pending; };
  try {
    const controller = await loadMethods('../src/features/controllers/AdminRegistrationView.js',
      'const mapState = () => ({}); const AppButton = {}; const AppRawButton = {};\n'
      + 'const RegistrationFieldsDialog = {}; const RegistrationAcceptanceDialog = {};\n'
      + 'const normalizeFixedFieldLabels = labels => labels || {};\n'
      + `const fetchRegistrationDashboardData = () => globalThis['${key}']();\n`);
    const context = { ...controller.data(), ...controller.methods, $emit() {}, $toast: { error() {} } };
    const loading = context.loadRegistrationData();
    const opening = context.openFieldsDialog();
    assert.equal(context.fieldsDialogOpen, false);
    assert.equal(requests, 1);
    resolve({ fields: [{ id: 'age' }], fixedLabels: { name: 'Stored label' }, requests: [] });
    await Promise.all([loading, opening]);
    assert.equal(context.fieldsDialogOpen, true);
    assert.equal(context.fixedLabels.name, 'Stored label');
    assert.equal(context.registrationFields[0].id, 'age');
  } finally { delete globalThis[key]; }
});

test('registration editing remains closed after a failed read and permits retry', async () => {
  let fail = true;
  const key = 'momarsRegistrationRetry';
  globalThis[key] = async () => { if (fail) throw new Error('offline'); return { fields: [], fixedLabels: {}, requests: [] }; };
  try {
    const controller = await loadMethods('../src/features/controllers/AdminRegistrationView.js',
      'const mapState = () => ({}); const AppButton = {}; const AppRawButton = {};\n'
      + 'const RegistrationFieldsDialog = {}; const RegistrationAcceptanceDialog = {};\n'
      + 'const normalizeFixedFieldLabels = labels => labels || {};\n'
      + `const fetchRegistrationDashboardData = () => globalThis['${key}']();\n`);
    const context = { ...controller.data(), ...controller.methods, $emit() {}, $toast: { error() {} } };
    await context.openFieldsDialog();
    assert.equal(context.fieldsDialogOpen, false);
    assert.equal(context.registrationLoadRequest, null);
    fail = false;
    await context.openFieldsDialog();
    assert.equal(context.fieldsDialogOpen, true);
  } finally { delete globalThis[key]; }
});

for (const type of ['pre', 'post', 'tasks', 'final']) {
  test(`${type} reconciles a saved submission when the confirmation response is lost`, async () => {
    const methods = type === 'tasks' ? await loadMethods('../src/features/tasks/tasksAnswerMethods.js',
      'const submitPublicAssessment = async () => { throw new Error("response lost"); };\n')
      : type === 'final' ? await loadMethods('../src/features/finalExam/publicFinalExamSubmissionMethods.js',
        'const submitPublicFinalExam = async () => { throw new Error("response lost"); };\n') : courseMethods;
    const collection = type === 'final' ? 'finalExamSubmissions' : 'submissions';
    const saved = { id: 'saved', courseId: 'course', assessmentType: type, loginId: '100', loginCode: '100', answers: [] };
    const context = { ...methods, student: { loginId: '100', name: 'Student' }, activeCourse: { id: 'course' },
      selectedTask: { id: 'course', taskMode: 'questions' }, isEnabled: true, taskIsEnabled: true,
      isAssessmentEnabled: true, resolvedAssessmentType: type, existingSubmission: null,
      questions: [{ id: 'q' }], taskQuestions: [{ id: 'q' }], answers: { q: 'answer' }, files: {},
      satisfactionQuestions: [], publicSnapshot: { [collection]: [] },
      buildSubmissionAnswers: async () => [{ questionId: 'q', value: 'answer' }],
      submitAssessmentAnswers: async () => { throw new Error('response lost'); },
      fetchPublicSnapshotWithTimeout: async () => ({ [collection]: [saved] }) };
    await context.handleSubmit();
    assert.equal(context.publicSnapshot[collection][0]?.id, 'saved');
    assert.equal(context.pageError, '');
  });
}

for (const switchAccount of [false, true]) {
  test(`separate survey recovers a lost confirmation with account switch=${switchAccount}`, async () => {
    const saved = { satisfactionResponses: [{ id: 'saved', courseId: 'course', questionId: 'q', loginCode: '100' }] };
    const store = { state: { authGeneration: 1, dashboardSnapshot: { satisfactionResponses: [] } },
      commit(name, snapshot) { assert.equal(name, 'setDashboardSnapshot'); this.state.dashboardSnapshot = snapshot; } };
    const key = `momarsSurveyRecovery${switchAccount}`;
    globalThis[key] = async () => { if (switchAccount) store.state.authGeneration++; return saved; };
    try {
      const controller = await loadMethods('../src/features/controllers/SatisfactionView.js',
        'const mapActions = () => ({}); const mapState = () => ({}); const AppButton = {};\n'
        + 'const submitPublicSatisfactionResponses = async () => { throw new Error("response lost"); };\n'
        + `const fetchDashboardSnapshot = () => globalThis['${key}']();\n`);
      const context = { ...controller.methods, $store: store, activeCourse: { id: 'course' },
        student: { loginId: '100', name: 'Student' }, hasPostSubmission: true,
        satisfactionQuestions: [{ id: 'q', type: 'rating' }], answers: { q: { ratingValue: 1 } }, validateAnswers: () => true };
      await context.handleSubmit();
      assert.equal(store.state.dashboardSnapshot.satisfactionResponses.length, switchAccount ? 0 : 1);
      assert.equal(context.pageError || '', '');
      assert.equal(context.submitting, false);
    } finally {
      delete globalThis[key];
    }
  });
}
