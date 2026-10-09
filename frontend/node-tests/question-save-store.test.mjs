import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/store/modules/courses.js', import.meta.url), 'utf8');
const actions = async request => (await import(`data:text/javascript;base64,${Buffer.from(
  `const syncCourseQuestionsRequest = ${request};\n${source.slice(source.indexOf('const reloadSnapshot'))}`,
).toString('base64')}`)).courseActions;

test('question save immediately publishes real server IDs without requiring a dashboard reload', async () => {
  const { syncCourseQuestions } = await actions("async () => ({ data: { questions: [{ id: 'server-id', type: 'truefalse', options: ['صح', 'خطأ'], correctAnswer: 'صح' }] } })");
  const previous = { id: 'course', preQuestions: [], postQuestions: [{ id: 'post' }], title: 'Course' };
  const other = { id: 'other', preQuestions: [] };
  const state = { dashboardSnapshot: { courses: [previous, other], submissions: [{ id: 'history' }] } };
  await syncCourseQuestions({ state, commit(name, snapshot) {
    assert.equal(name, 'setDashboardSnapshot');
    state.dashboardSnapshot = snapshot;
  }, dispatch() { assert.fail('saving depended on another snapshot request'); } }, {
    courseId: 'course', payload: { assessmentType: 'pre', questions: [] },
  });
  assert.equal(state.dashboardSnapshot.courses[0].preQuestions[0].id, 'server-id');
  assert.deepEqual(state.dashboardSnapshot.courses[0].preQuestions[0].options, ['صح', 'خطأ']);
  assert.deepEqual(state.dashboardSnapshot.courses[0].postQuestions, previous.postQuestions);
  assert.equal(state.dashboardSnapshot.courses[1], other);
  assert.deepEqual(state.dashboardSnapshot.submissions, [{ id: 'history' }]);
});

test('a rejected save leaves the existing questions untouched', async () => {
  const { syncCourseQuestions } = await actions("async () => { throw new Error('Save rejected'); }");
  await assert.rejects(() => syncCourseQuestions({ state: { authGeneration: 1 }, commit() { assert.fail('rejected data was published'); } }, {
    courseId: 'course', payload: { assessmentType: 'tasks', questions: [] },
  }), /Save rejected/);
});

test('a save response from an ended session cannot restore dashboard data', async () => {
  const { syncCourseQuestions } = await actions("async () => ({ data: { questions: [] } })");
  const state = { authGeneration: 1, dashboardSnapshot: { courses: [{ id: 'course' }] } };
  const pending = syncCourseQuestions({ state, commit() { assert.fail('data leaked across sessions'); } }, {
    courseId: 'course', payload: { assessmentType: 'pre', questions: [] },
  });
  state.authGeneration = 2;
  state.dashboardSnapshot = null;
  await pending;
  assert.equal(state.dashboardSnapshot, null);
});

test('final exam additions edits and deletions preserve other branches and publish only accepted requests', async () => {
  const feedback = await readFile(new URL('../src/store/modules/feedback.js', import.meta.url), 'utf8');
  const stubs = `
    const createFinalExamQuestion = async () => ({ id: 'saved', createdAt: 'now' });
    const updateFinalExamQuestionRequest = async () => {};
    const deleteFinalExamQuestionRequest = async () => {};
  `;
  const { feedbackActions } = await import(`data:text/javascript;base64,${Buffer.from(
    stubs + feedback.slice(feedback.indexOf('const setFinalExamQuestions')),
  ).toString('base64')}`);
  const other = { id: 'other', branchCode: 'male', prompt: 'Keep' };
  const state = { dashboardSnapshot: { finalExamQuestions: [other], submissions: [{ id: 'history' }] } };
  const context = { state, commit(name, snapshot) {
    assert.equal(name, 'setDashboardSnapshot');
    state.dashboardSnapshot = snapshot;
  }, dispatch() { assert.fail('final exam question save depended on a reload'); } };
  const result = await feedbackActions.addFinalExamQuestion(context, {
    branchCode: 'female', prompt: 'True?', type: 'truefalse', options: [], points: 2, correctAnswer: 'صح',
  });
  assert.equal(result.id, 'saved');
  assert.deepEqual(state.dashboardSnapshot.finalExamQuestions[1].options, ['صح', 'خطأ']);
  await feedbackActions.updateFinalExamQuestion(context, {
    questionId: result.id, question: { prompt: 'Changed', type: 'truefalse', options: [], correctAnswer: 'خطأ' },
  });
  assert.equal(state.dashboardSnapshot.finalExamQuestions[1].branchCode, 'female');
  assert.equal(state.dashboardSnapshot.finalExamQuestions[1].correctAnswer, 'خطأ');
  await feedbackActions.deleteFinalExamQuestion(context, result.id);
  assert.deepEqual(state.dashboardSnapshot.finalExamQuestions, [other]);
  assert.deepEqual(state.dashboardSnapshot.submissions, [{ id: 'history' }]);
});
