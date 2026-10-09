import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import courseSave from '../src/features/assessment/assessmentQuestionSaveMethods.js'
import { createQuestionDraft, validateQuestionDraft } from '../src/features/assessmentQuestions/questionModel.mjs'
import { createFinalExamState } from '../src/features/finalExam/finalExamViewModel.mjs'

const file = fileURLToPath(new URL('../src/features/finalExam/finalExamQuestionMethods.js', import.meta.url))
const source = (await readFile(file, 'utf8')).replace(/from '([^']+)'/g, (_, specifier) => {
  let resolved = path.resolve(path.dirname(file), specifier)
  if (!path.extname(resolved)) resolved += '.js'
  return `from '${pathToFileURL(resolved).href}'`
})
const { finalExamQuestionMethods: finalSave } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
const toast = { success() {}, error() {} }
const question = { id: 'kept', prompt: 'Keep', type: 'text', points: 1 }

test('course deletion sends no updates for unchanged remaining questions and accepts an empty set', async () => {
  let payload
  const context = {
    selectedCourse: { id: 'course' }, isSaving: false, visibleSelectedQuestions: [question],
    questionForms: [], questionErrors: [], questionDrafts: { kept: createQuestionDraft(question) },
    questionDraftErrors: {}, pendingDeletedQuestionIds: ['removed'], detailAssessmentType: 'post',
    isTasksPage: false, validateQuestionDraft, $toast: toast, resetQuestionForms() {},
    syncCourseQuestions: async input => { payload = input.payload },
  }
  await courseSave.handleSaveAllQuestions.call(context)
  assert.deepEqual(payload, { assessmentType: 'post', questions: [], deletedQuestionIds: ['removed'] })
  context.visibleSelectedQuestions = []
  context.pendingDeletedQuestionIds = ['kept']
  await courseSave.handleSaveAllQuestions.call(context)
  assert.deepEqual(payload.deletedQuestionIds, ['kept'])
  assert.deepEqual(payload.questions, [])
})

test('final exam deletion works repeatedly without blank forms or unchanged updates', async () => {
  const deleted = []
  const context = {
    ...createFinalExamState(),
    isSaving: false, visibleBranchQuestions: [question], questionForms: [], questionDrafts: { kept: createQuestionDraft(question) },
    questionDraftErrors: {}, questionErrors: [], pendingDeletedQuestionIds: ['one'],
    validateQuestionDraft, $toast: toast,
    updateFinalExamQuestion: async () => { assert.fail('unchanged question was updated') },
    deleteFinalExamQuestion: async id => deleted.push(id),
  }
  await finalSave.handleSaveAllQuestions.call(context)
  assert.deepEqual(context.questionForms, [])
  context.pendingDeletedQuestionIds = ['two']
  await finalSave.handleSaveAllQuestions.call(context)
  assert.deepEqual(deleted, ['one', 'two'])
  finalSave.handleAddQuestionSlot.call(context)
  finalSave.handleRemoveQuestionSlot.call(context, 0)
  assert.deepEqual(context.questionForms, [])
  finalSave.handleCreateQuestionDialogChange.call(context, false)
  assert.deepEqual(context.questionForms, [])
})

test('final exam retry does not resend a completed deletion after a later request fails', async () => {
  const deleted = []
  const context = {
    isSaving: false, visibleBranchQuestions: [], questionForms: [], questionDraftErrors: {},
    pendingDeletedQuestionIds: ['one', 'two'], $toast: toast,
    deleteFinalExamQuestion: async id => {
      deleted.push(id)
      if (id === 'two') throw new Error('temporary failure')
    },
  }
  await finalSave.handleSaveAllQuestions.call(context)
  assert.deepEqual(deleted, ['one', 'two'])
  assert.deepEqual(context.pendingDeletedQuestionIds, ['two'])
})

test('legacy incomplete unchanged questions cannot block deletion in either editor', async () => {
  const legacy = { id: 'legacy', type: 'multiple', prompt: 'Legacy', options: [], points: 1, correctAnswer: '' }
  const context = {
    selectedCourse: { id: 'course' }, visibleSelectedQuestions: [legacy], visibleBranchQuestions: [legacy],
    questionForms: [], questionDraftErrors: {}, questionDrafts: { legacy: createQuestionDraft(legacy) },
    pendingDeletedQuestionIds: ['deleted'], detailAssessmentType: 'pre', isSaving: false,
    validateQuestionDraft, resetQuestionForms() {}, $toast: toast,
  }
  let courseDeleted = false
  context.syncCourseQuestions = async ({ payload }) => {
    assert.deepEqual(payload.questions, [])
    courseDeleted = true
  }
  await courseSave.handleSaveAllQuestions.call(context)
  assert.equal(courseDeleted, true)
  context.pendingDeletedQuestionIds = ['deleted']
  const finalDeleted = []
  context.deleteFinalExamQuestion = async id => finalDeleted.push(id)
  await finalSave.handleSaveAllQuestions.call(context)
  assert.deepEqual(finalDeleted, ['deleted'])
})
