import assert from 'node:assert/strict'
import test from 'node:test'
import { buildGradeRows, gradeChanges, validateGradeDraft } from '../src/features/results/gradeEntryModel.mjs'
import { formatResultScore, buildResultDetailCards, hasPendingManualReview } from '../src/features/results/resultModel.mjs'

test('manual results preserve zero and scale without questions or pending answer review', () => {
  const result = { manualScore: 0, scoreTotal: 15, scoreOnly: true, answers: [] }
  const questions = [{ id: 'q', type: 'text', points: 4 }]
  assert.equal(formatResultScore([], result), '0 / 15')
  assert.equal(formatResultScore(questions, result), '0 / 15')
  assert.equal(formatResultScore([], { ...result, manualScore: 12.25, scoreTotal: 15.75 }), '12.25 / 15.75')
  assert.equal(hasPendingManualReview(questions, result), false)
  assert.deepEqual(buildResultDetailCards(questions, result), [])
  assert.equal(formatResultScore([], null), 'غير مرسل')
  assert.equal(formatResultScore([], { manualScore: 7, answers: [] }), '7')
  assert.equal(formatResultScore([{ id: 'q', points: 3, correctAnswer: 'نعم' }],
    { answers: [{ questionId: 'q', value: 'نعم' }] }), '3 / 3')
  assert.equal(formatResultScore(questions, { answers: [] }), 'بانتظار التصحيح اليدوي')
  assert.equal(formatResultScore([], { answers: [] }), '0 إجابة')
})

test('bulk drafts distinguish untouched blanks, zero, changes and explicit clears', () => {
  const rows = buildGradeRows({ courses: [{ id: 'c', preQuestions: [] }],
    students: [{ id: 'a', name: 'الأول', loginId: '1' }, { id: 'b', name: 'الثاني', loginId: '2' }],
    submissions: [{ loginId: '2', manualScore: 10, scoreTotal: 15, answers: [] }],
    scoreEntries: [{ studentId: 'b', version: 'v' }] }, 'c', 'pre')
  assert.deepEqual(gradeChanges(rows), [])
  rows[0].value = '0'
  assert.deepEqual(gradeChanges(rows), [{ studentId: 'a', score: 0, expectedVersion: null }])
  rows[1].value = ''
  assert.equal(gradeChanges(rows).length, 1)
  rows[1].clear = true
  assert.deepEqual(gradeChanges(rows)[1], { studentId: 'b', score: null, expectedVersion: 'v' })
  assert.deepEqual(validateGradeDraft(rows, '15'), {})
})

test('invalid values identify the student even if a search has hidden the row', () => {
  const rows = [{ id: 'a', value: '16' }, { id: 'b', value: '0' }, { id: 'c', value: '-1' },
    { id: 'd', value: '1.234' }, { id: 'e', value: 'not-a-score' }]
  assert.deepEqual(Object.keys(validateGradeDraft(rows, '15')), ['a', 'c', 'd', 'e'])
  assert.equal(validateGradeDraft(rows, '15').a, 'يجب أن تساوي درجة الاختبار درجة الطالب أو تزيد عليها.')
  assert.deepEqual(validateGradeDraft([{ id: 'equal', value: '15' }], '15'), {})
  assert.ok(validateGradeDraft([], '').totalPoints)
  assert.ok(validateGradeDraft([], '0').totalPoints)
  assert.ok(validateGradeDraft([], '1.234').totalPoints)
})

