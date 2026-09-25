import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  finalExamAnswersMatch,
  finalExamReviewPresentation,
  gradeFinalExamSubmission,
  isFinalExamAvailable,
  resolveFinalExamPreviewKind,
  resolveFinalExamQuestions,
  resolveFinalExamStudent,
  resolveFinalExamSubmission,
  submittedFinalExamAnswer,
} from '../src/features/finalExam/publicFinalExamModel.mjs';

const source = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const questions = [
  { id: 'q2', branchCode: 'female', sortOrder: 1, points: 4, correctAnswer: 'خطأ' },
  { id: 'q1', branchCode: 'male', sortOrder: 2, points: 3, correctAnswer: 'نعم' },
  { id: 'q0', branchCode: 'male', sortOrder: 1, points: 2, correctAnswer: '' },
];
const submission = {
  loginCode: '100',
  answers: [{ questionId: 'q1', value: ' نعم ' }, { questionId: 'q0', value: 'نص' }],
};

test('public final exam model resolves scoped questions students and submissions', () => {
  assert.deepEqual(resolveFinalExamQuestions(questions, 'male').map(({ id }) => id), ['q0', 'q1']);
  assert.equal(resolveFinalExamStudent([{ loginId: '100' }], '100')?.loginId, '100');
  assert.equal(resolveFinalExamSubmission([submission], '100'), submission);
  assert.equal(submittedFinalExamAnswer(submission, 'q1'), ' نعم ');
});

test('public final exam availability and grading preserve business rules', () => {
  const student = { loginId: '100' };
  assert.equal(isFinalExamAvailable(student, { isEnabled: true, closesAt: null }, 100), true);
  assert.equal(isFinalExamAvailable(student, { isEnabled: true, closesAt: '2026-01-01T00:00:00Z' }, Date.now()), false);
  assert.equal(finalExamAnswersMatch('نعم', ' نعم '), true);
  assert.deepEqual(gradeFinalExamSubmission(resolveFinalExamQuestions(questions, 'male'), submission), { score: 3, total: 5 });
  assert.deepEqual(gradeFinalExamSubmission(questions, { ...submission, manualScore: 12 }), { score: 12, total: 12 });
});

test('public final exam previews and review labels remain consistent', () => {
  assert.equal(resolveFinalExamPreviewKind({ type: 'image/webp' }), 'image');
  assert.equal(resolveFinalExamPreviewKind({ dataUrl: 'data:application/pdf;base64,AA==' }), 'pdf');
  assert.equal(resolveFinalExamPreviewKind({ type: 'video/mp4' }), 'video');
  assert.equal(resolveFinalExamPreviewKind({ type: 'text/plain' }), 'other');
  assert.equal(finalExamReviewPresentation(questions[1], submission).modifier, 'success');
});

test('public final exam view delegates dialogs attempts and reviews', async () => {
  const [view, controller, styles] = await Promise.all([
    source('../src/views/FinalExamView.vue'),
    source('../src/features/controllers/FinalExamView.js'),
    source('../src/styles/components/final-exam-attempt-panel.css'),
  ]);

  for (const component of ['AttachmentPreviewDialog', 'FinalExamAttemptPanel', 'FinalExamReviewPanel']) {
    assert.match(view, new RegExp(`<${component}`));
    assert.match(controller, new RegExp(component));
  }
  assert.equal(view.includes('login-open'), false);
  assert.equal(view.includes('رقم الدخول'), false);
  assert.equal(view.includes('<AppDialog'), false);
  assert.equal(view.includes('<AppChoiceButton'), false);
  assert.match(styles, /\.assessment-pill-button[\s\S]*?min-height: 44px;/);
});
