import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildResultDetailCards,
  calculateSubmissionScore,
  formatScoreValue,
  hasPendingManualReview,
  normalizeResultAnswer,
  resolveCorrectAnswer,
  resolveStudentAnswer,
} from '../src/features/results/resultModel.mjs'

test('historical answer cards preserve attachments and pending manual review', () => {
  const answer = { id: 'a', questionId: 'q', fileName: 'work.pdf', type: 'text', points: 3 }
  const submission = { answers: [answer] }
  const attachmentResolver = value => ({ name: value.fileName })
  const cards = buildResultDetailCards([], submission, { attachmentResolver })
  assert.deepEqual(cards[0].attachment, { name: 'work.pdf' })
  assert.equal(hasPendingManualReview([], submission), true)
  assert.equal(cards[0].statusText, 'بانتظار التصحيح اليدوي')
  answer.manualPoints = 2
  assert.equal(hasPendingManualReview([], submission), false)
  const liveCards = buildResultDetailCards([{ id: 'q', type: 'text', points: 3 }], submission, { attachmentResolver })
  assert.equal(liveCards[0].statusText, 'تم التصحيح: 2 / 3')
})

test('result values and answer labels are normalized consistently', () => {
  assert.equal(normalizeResultAnswer('  إجابة   صحيحة '), 'إجابة صحيحة')
  assert.equal(formatScoreValue(2), '2')
  assert.equal(formatScoreValue(2.25), '2.3')
  assert.equal(formatScoreValue(null), '--')
  assert.equal(resolveStudentAnswer(null), 'لا توجد إجابة')
  assert.equal(resolveStudentAnswer({ fileName: 'حل.pdf' }), 'ملف مرفق: حل.pdf')
  assert.equal(resolveStudentAnswer({ value: 'جواب' }), 'جواب')
  assert.equal(resolveCorrectAnswer(null), 'لا توجد إجابة محددة')
})

test('submission score honors manual scores and grades comparable answers', () => {
  const questions = [
    { id: 'q1', points: 2, correctAnswer: 'نعم' },
    { id: 'q2', points: 3, correctAnswer: 'إجابة صحيحة' },
    { id: 'q3', points: 5, correctAnswer: '' },
  ]
  const submission = { answers: [
    { questionId: 'q1', value: 'نعم' },
    { questionId: 'q2', value: ' إجابة   صحيحة ' },
    { questionId: 'q3', value: 'إجابة نصية' },
  ] }

  assert.equal(calculateSubmissionScore(questions, submission), null)
  assert.equal(hasPendingManualReview(questions, submission), true)
  assert.equal(calculateSubmissionScore(questions, {
    ...submission,
    answers: submission.answers.map(answer => (answer.questionId === 'q3'
      ? { ...answer, manualPoints: 4 }
      : answer)),
  }), 9)
  assert.equal(calculateSubmissionScore(questions, { ...submission, manualScore: 4 }), 4)
  assert.equal(calculateSubmissionScore([], submission), null)
  assert.equal(calculateSubmissionScore(questions, null), null)
})

test('detail cards support rich text attachments and correctness states', () => {
  const questions = [
    { id: 'q1', prompt: 'اختر', points: 1, correctAnswer: 'أ' },
    { id: 'q2', prompt: 'اشرح', points: 2, correctAnswer: '' },
  ]
  const submission = { answers: [
    { id: 'a1', questionId: 'q1', value: 'أ' },
    { id: 'a2', questionId: 'q2', value: '<p>نص</p>', manualPoints: 1.5 },
  ] }
  const cards = buildResultDetailCards(questions, submission, {
    richTextAnswers: true,
    attachmentResolver: answer => answer?.fileName || null,
  })

  assert.equal(cards[0].isCorrect, true)
  assert.equal(cards[0].statusText, 'صحيحة')
  assert.equal(cards[1].isCorrect, null)
  assert.equal(cards[1].studentAnswerHtml, '<p>نص</p>')
  assert.equal(cards[1].hideCorrectAnswer, true)
  assert.equal(cards[1].requiresManualReview, true)
  assert.equal(cards[1].statusText, 'تم التصحيح: 1.5 / 2')
})

test('detail cards fall back to raw submission answers when questions are unavailable', () => {
  const cards = buildResultDetailCards([], { answers: [{ questionId: 'lost', value: '' }] })
  assert.equal(cards.length, 1)
  assert.equal(cards[0].prompt, 'السؤال 1')
  assert.equal(cards[0].studentAnswer, 'لا توجد إجابة')
  assert.equal(cards[0].hideCorrectAnswer, true)
  assert.equal(cards[0].statusText, 'بانتظار التصحيح اليدوي')
})

test('student score uses server-awarded points without exposing answer keys', () => {
  const questions = [{ id: 'q1', prompt: 'اختر', points: 3, correctAnswer: '' }]
  const submission = { answers: [{
    id: 'a1', questionId: 'q1', value: 'أ', requiresManualReview: false,
    awardedPoints: 3, isCorrect: true,
  }] }

  assert.equal(calculateSubmissionScore(questions, submission), 3)
  assert.equal(hasPendingManualReview(questions, submission), false)
  assert.equal(buildResultDetailCards(questions, submission)[0].statusText, 'صحيحة')
})
