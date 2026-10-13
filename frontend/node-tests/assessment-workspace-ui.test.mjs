import assert from 'node:assert/strict';
import test from 'node:test';
import methods, { removeEditorOption } from '../src/features/assessment/assessmentWorkspaceUi.js';
import indicatorMethods from '../src/features/assessment/assessmentIndicatorMethods.js';
import courseMethods from '../src/features/assessment/assessmentCourseMethods.js';
import courseDialogMethods from '../src/features/assessment/assessmentCourseDialogMethods.js';
import watchers from '../src/features/assessment/adminAssessmentWatchers.js';
import { createQuestionDraft } from '../src/features/assessmentQuestions/questionModel.mjs';

test('removing an answer clears the correct choice only when that answer is removed', () => {
  const draft = { options: ['أول', 'ثان', 'ثالث'], correctAnswer: 'ثالث', correctAnswerTouched: true };
  assert.deepEqual(removeEditorOption(draft, 2), { options: ['أول', 'ثان'], correctAnswer: '', correctAnswerTouched: false });
  assert.deepEqual(removeEditorOption(draft, 0), { options: ['ثان', 'ثالث'], correctAnswer: 'ثالث', correctAnswerTouched: true });
  assert.equal(removeEditorOption({ ...draft, options: ['أول', 'ثان'] }, 1), null);
  assert.equal(removeEditorOption(draft, 9), null);
});

test('a catalog refresh preserves an edited draft and a successful save adopts server values', () => {
  const question = { id: 'q', prompt: 'سؤال محفوظ', type: 'text', points: 3 };
  const context = {
    selectedCourseId: 'c', detailAssessmentType: 'pre', questionDraftContext: 'c:pre',
    questionDrafts: { q: { ...createQuestionDraft(question), prompt: 'مسودة جديدة' } },
    questionDraftErrors: {}, pendingDeletedQuestionIds: [], createQuestionDraft,
  };
  indicatorMethods.syncQuestionDrafts.call(context, [question]);
  assert.equal(context.questionDrafts.q.prompt, 'مسودة جديدة');
  context.isSaving = true;
  indicatorMethods.syncQuestionDrafts.call(context, [{ ...question, prompt: 'مسودة محفوظة' }]);
  assert.equal(context.questionDrafts.q.prompt, 'مسودة محفوظة');
  context.isSaving = false;
  context.detailAssessmentType = 'post';
  indicatorMethods.syncQuestionDrafts.call(context, [question]);
  assert.equal(context.questionDrafts.q.prompt, question.prompt);
});

test('canceling the discard dialog keeps the current editor and unsaved input', async () => {
  const context = {
    hasUnsavedAssessmentChanges: true, selectedCourseId: 'original', questionForms: [{ prompt: 'مسودة' }],
    confirmDiscardChanges() { return methods.confirmDiscardChanges.call(this); },
  };
  const change = methods.requestCourseChange.call(context, 'other');
  assert.equal(context.discardChangesDialogOpen, true);
  methods.resolveDiscardChanges.call(context, false);
  await change;
  assert.equal(context.selectedCourseId, 'original');
  assert.equal(context.questionForms[0].prompt, 'مسودة');
  assert.equal(context.discardChangesDialogOpen, false);
});

test('readonly attendance and in-flight saves cannot trigger the manual save action', async () => {
  let saves = 0;
  const context = { canEditAttendance: false, isSavingAttendance: false, saveAttendance: async () => saves++ };
  await methods.saveAttendanceNow.call(context);
  context.canEditAttendance = true;
  context.isSavingAttendance = true;
  await methods.saveAttendanceNow.call(context);
  assert.equal(saves, 0);
  context.isSavingAttendance = false;
  await methods.saveAttendanceNow.call(context);
  assert.equal(saves, 1);
});

test('changing the course waits for queued attendance to save in its original context', async () => {
  const calls = [];
  const context = {
    selectedCourseId: 'original', attendanceSaveTimer: 1, canEditAttendance: true,
    hasUnsavedAssessmentChanges: false,
    saveAttendance: async function () { calls.push(this.selectedCourseId); this.saveStatusText = 'تم حفظ التحضير'; },
    saveAttendanceNow() { return methods.saveAttendanceNow.call(this); },
    confirmDiscardChanges() { return methods.confirmDiscardChanges.call(this); },
  };
  await methods.requestCourseChange.call(context, 'other');
  assert.deepEqual(calls, ['original']);
  assert.equal(context.attendanceSaveTimer, null);
  assert.equal(context.selectedCourseId, 'other');
});

test('changing the attendance branch saves the original branch and canceling a failed save keeps it selected', async () => {
  const savedBranches = [];
  const context = {
    attendanceBranchId: 'male', attendanceSaveTimer: 1, canEditAttendance: true,
    hasUnsavedAssessmentChanges: false,
    saveAttendance: async function () { savedBranches.push(this.attendanceBranchId); this.saveStatusText = 'تم حفظ التحضير'; },
    saveAttendanceNow() { return methods.saveAttendanceNow.call(this); },
    confirmDiscardChanges() { return methods.confirmDiscardChanges.call(this); },
  };
  await methods.requestAttendanceBranchChange.call(context, 'female');
  assert.deepEqual(savedBranches, ['male']);
  assert.equal(context.attendanceBranchId, 'female');
  context.saveStatusText = 'تعذر حفظ التحضير';
  const change = methods.requestAttendanceBranchChange.call(context, 'male');
  assert.equal(context.discardChangesDialogOpen, true);
  methods.resolveDiscardChanges.call(context, false);
  await change;
  assert.equal(context.attendanceBranchId, 'female');
});

test('a slower previous selection cannot overwrite the latest course, mode or branch choice', async () => {
  for (const [method, field, initial, other] of [
    ['requestCourseChange', 'selectedCourseId', 'original', 'other'],
    ['requestViewModeChange', 'viewMode', 'pre', 'post'],
    ['requestAttendanceBranchChange', 'attendanceBranchId', 'male', 'female'],
  ]) {
    let allowChange;
    const confirmation = new Promise(resolve => { allowChange = resolve; });
    const context = { [field]: initial, confirmDiscardChanges: () => confirmation };
    const first = methods[method].call(context, other);
    assert.equal(context.pendingWorkspaceChanges, 1);
    await methods[method].call(context, initial);
    allowChange(true);
    await first;
    assert.equal(context[field], initial);
    assert.equal(context.pendingWorkspaceChanges, 0);
  }
});

test('refreshing the catalog preserves the selected course and an explicit new link still changes it', async () => {
  const context = {
    selectedCourseId: 'selected', resolvedCourseId: 'linked', hasCourseSelectionUi: true,
    filteredCourses: [{ id: 'linked' }, { id: 'selected' }, { id: 'new-link' }],
    defaultCourseSelectionId: () => 'linked', confirmDiscardChanges: () => true,
    requestCourseChange(value) { return methods.requestCourseChange.call(this, value); },
  };
  courseMethods.syncSelectedCourse.call(context);
  assert.equal(context.selectedCourseId, 'selected');
  context.resolvedCourseId = 'new-link';
  await watchers.resolvedCourseId.call(context, 'new-link');
  assert.equal(context.selectedCourseId, 'new-link');
  context.selectedCourseId = '';
  courseMethods.syncSelectedCourse.call(context);
  assert.equal(context.selectedCourseId, 'new-link');
});

test('deleting the current course clears its draft while deleting another course preserves the draft', async () => {
  for (const deletingCurrent of [true, false]) {
    const context = {
      courseDeleteId: 'deleted', selectedCourseId: deletingCurrent ? 'deleted' : 'fallback',
      questionForms: [{ prompt: 'مسودة' }], pendingDeletedQuestionIds: ['pending'],
      async deleteCourse() { this.selectedCourseId = 'fallback'; },
      resetQuestionForms() { this.questionForms = []; }, syncSelectedCourse() {}, closeCourseDeleteDialog() {},
      $toast: { success() {} },
    };
    await courseDialogMethods.confirmManagedCourseDelete.call(context);
    assert.equal(context.questionForms.length, deletingCurrent ? 0 : 1);
    assert.equal(context.pendingDeletedQuestionIds.length, deletingCurrent ? 0 : 1);
    assert.equal(context.selectedCourseId, 'fallback');
  }
});
