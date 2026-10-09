import assert from 'node:assert/strict'
import test from 'node:test'

import {
  applyPastedQuestionOptions,
  createEmptyQuestionForm,
  createQuestionDraft,
  hasQuestionDraftChanges,
  isCorrectQuestionOption,
  mapImportedQuestionToForm,
  normalizeAssessmentAnswer,
  updateQuestionOption,
  validateQuestionDraft,
} from '../src/features/assessmentQuestions/questionModel.mjs'

test('question factories isolate mutable option arrays and normalize persisted data', () => {
  const first = createEmptyQuestionForm()
  const second = createEmptyQuestionForm()
  first.options[0] = 'متغير'

  assert.deepEqual(second.options, ['', ''])
  assert.deepEqual(createQuestionDraft({ type: 'text', points: 0, prompt: 'سؤال' }), {
    prompt: 'سؤال', type: 'text', options: [], points: '0', correctAnswer: '', correctAnswerTouched: false,
  })
  const persistedMultiple = createQuestionDraft({ type: 'multiple', options: ['نعم', 'لا'], correctAnswer: 'نعم' })
  assert.deepEqual(persistedMultiple.options, ['نعم', 'لا'])
  assert.equal(persistedMultiple.correctAnswerTouched, true)
  assert.deepEqual(createQuestionDraft({ type: 'multiple' }).options, ['', ''])
})

test('answer normalization handles Arabic variants labels and punctuation', () => {
  assert.equal(normalizeAssessmentAnswer('أ) مَدْرَسَة؟'), 'مدرسه')
  assert.equal(normalizeAssessmentAnswer('  إجابة.  '), 'اجابه')
})

test('saved true/false questions retain their options and correct answer when edited', () => {
  for (const options of [undefined, [], ['صح', 'خطأ']]) {
    const question = { type: 'truefalse', prompt: 'صح أم خطأ؟', options, points: 2, correctAnswer: 'صح' }
    const draft = createQuestionDraft(question)
    assert.equal(draft.type, 'multiple')
    assert.deepEqual(draft.options, ['صح', 'خطأ'])
    assert.equal(draft.correctAnswer, 'صح')
    assert.equal(validateQuestionDraft(draft), '')
    assert.equal(hasQuestionDraftChanges(question, draft), false)
    assert.equal(validateQuestionDraft({ ...draft, prompt: 'السؤال المعدل' }), '')
    if (options?.length) {
      draft.options[0] = 'متغير'
      assert.deepEqual(question.options, ['صح', 'خطأ'])
    }
  }
})

test('saving deletion skips unchanged questions but detects meaningful draft edits', () => {
  const question = { type: 'multiple', prompt: 'اختر', options: ['أ', 'ب'], points: 2, correctAnswer: 'أ' }
  const draft = createQuestionDraft(question)
  assert.equal(hasQuestionDraftChanges(question, draft), false)
  assert.equal(hasQuestionDraftChanges(question, { ...draft, prompt: ' اختر ', options: ['أ', 'ب', ''], points: '2' }), false)
  for (const patch of [{ prompt: 'سؤال آخر' }, { options: ['أ', 'ج'] }, { points: 0 }, { correctAnswer: 'ب' }, { type: 'text' }]) {
    assert.equal(hasQuestionDraftChanges(question, { ...draft, ...patch }), true)
  }
  const text = { type: 'text', prompt: 'اشرح', points: 0 }
  assert.equal(hasQuestionDraftChanges(text, { ...createQuestionDraft(text), correctAnswer: 'ignored' }), false)
  assert.equal(hasQuestionDraftChanges({}, { prompt: '', type: 'multiple', points: undefined }), false)
})

test('question validation covers prompt options answer and non-negative points', () => {
  assert.equal(validateQuestionDraft(createEmptyQuestionForm()), 'أدخل السؤال.')
  assert.equal(validateQuestionDraft({ ...createEmptyQuestionForm(), prompt: 'س؟' }), 'أدخل خيارين على الأقل.')
  assert.equal(validateQuestionDraft({ ...createEmptyQuestionForm(), prompt: 'س؟', options: ['أ', 'ب'] }), 'اختر الإجابة الصحيحة.')
  assert.equal(validateQuestionDraft({ ...createEmptyQuestionForm(), prompt: 'س؟', options: ['أ', 'ب'], correctAnswer: 'أ', points: -1 }), 'أدخل درجة صحيحة.')
  assert.equal(validateQuestionDraft({ ...createEmptyQuestionForm(), prompt: 'س؟', options: ['أ', 'ب'], correctAnswer: 'أ', points: 0 }), '')
  assert.equal(validateQuestionDraft({ ...createEmptyQuestionForm({ type: 'text' }), prompt: 'اشرح', points: 'خطأ' }), 'أدخل درجة صحيحة.')
  assert.equal(validateQuestionDraft({ ...createEmptyQuestionForm({ type: 'text' }), prompt: 'اشرح', points: 2 }), '')
  const trueFalse = { ...createEmptyQuestionForm({ type: 'truefalse' }), prompt: 'صح أم خطأ؟', points: 1 }
  assert.equal(validateQuestionDraft(trueFalse), '')
  assert.equal(validateQuestionDraft(trueFalse, { requireCorrectForTypes: ['multiple', 'truefalse'] }), 'اختر الإجابة الصحيحة.')
})

test('editing or pasting options keeps the correct answer only while it remains valid', () => {
  const draft = { ...createEmptyQuestionForm(), options: ['الرياض', 'جدة'], correctAnswer: 'الرياض', correctAnswerTouched: true }
  const renamed = updateQuestionOption(draft, 0, 'مكة')
  assert.equal(renamed.correctAnswer, 'مكة')
  assert.equal(isCorrectQuestionOption(renamed, 'مكة'), true)

  const pasted = applyPastedQuestionOptions(renamed, 0, ['الدمام', 'الخبر'])
  assert.equal(pasted.correctAnswer, '')
  assert.deepEqual(pasted.options, ['الدمام', 'الخبر'])

  const invalidated = updateQuestionOption({ ...draft, correctAnswer: 'غير موجود' }, 1, 'الخبر')
  assert.equal(invalidated.correctAnswer, '')

  const retained = applyPastedQuestionOptions(draft, 1, ['جدة', 'مكة', 'الرياض'])
  assert.equal(retained.correctAnswer, 'الرياض')
  assert.deepEqual(retained.options, ['الرياض', 'جدة', 'مكة', 'الرياض'])
  assert.equal(isCorrectQuestionOption({ ...retained, correctAnswerTouched: false }, 'الرياض'), false)
})

test('imported questions inherit points and resolve their effective type', () => {
  const result = mapImportedQuestionToForm({ prompt: 'اختر؟', type: 'text', options: ['أ', 'ب'] }, 3, 'multiple')
  assert.equal(result.type, 'multiple')
  assert.equal(result.points, '3')
  assert.deepEqual(result.options, ['أ', 'ب'])

  const multipleFallback = mapImportedQuestionToForm({ prompt: 'اختر؟', type: 'multiple', options: [] }, 1, 'text')
  assert.deepEqual(multipleFallback.options, ['', ''])

  const text = mapImportedQuestionToForm({ prompt: 'اشرح', type: 'text', options: [] }, 2, 'text')
  assert.equal(text.type, 'text')
  assert.deepEqual(text.options, [])
})
