import { normalizeAssessmentAnswer } from '../assessmentQuestions/questionModel.mjs';

export const removeEditorOption = (draft, index) => {
  if (!draft || draft.options.length <= 2 || index < 0 || index >= draft.options.length) return null;
  const options = draft.options.filter((_, optionIndex) => optionIndex !== index);
  const answerExists = options.some(option => normalizeAssessmentAnswer(option) === normalizeAssessmentAnswer(draft.correctAnswer));
  return { options, correctAnswer: answerExists ? draft.correctAnswer : '', correctAnswerTouched: answerExists && draft.correctAnswerTouched };
};

export const attendanceSelectionFromRecords = (records, students) => records.map(record => students.find(student => student.loginId === record.loginId)?.id).filter(Boolean);

export const editorComputed = {
  isChangingAssessmentContext() { return this.pendingWorkspaceChanges > 0; },
  editorQuestions() {
    return [
      ...this.visibleSelectedQuestions.map(question => ({ ...this.questionDrafts[question.id], promptId: `assessment-question-${question.id}-prompt` })),
      ...this.questionForms.map((form, index) => ({ ...form, promptId: `assessment-new-question-${index}-prompt` })),
    ];
  },
};

const requestWorkspaceChange = async (context, field, value) => {
  const revisions = context.workspaceChangeRevisions || (context.workspaceChangeRevisions = {});
  const revision = (revisions[field] || 0) + 1;
  revisions[field] = revision;
  if (value === context[field]) return;
  context.pendingWorkspaceChanges = (context.pendingWorkspaceChanges || 0) + 1;
  try {
    if (await context.confirmDiscardChanges() && revisions[field] === revision) context[field] = value;
  } finally { context.pendingWorkspaceChanges -= 1; }
};

export default {
  async confirmDiscardChanges() {
    if (this.isSaving || this.templateSaving) return false;
    if (this.attendanceSaveTimer) await this.saveAttendanceNow();
    else if (this.isSavingAttendance && this.attendanceSavePromise) await this.attendanceSavePromise;
    if (!this.hasUnsavedAssessmentChanges && this.saveStatusText !== 'تعذر حفظ التحضير') return true;
    if (this.discardChangesPromise) return this.discardChangesPromise;
    this.discardChangesDialogOpen = true;
    this.discardChangesPromise = new Promise(resolve => { this.discardChangesResolve = resolve; });
    return this.discardChangesPromise;
  },
  resolveDiscardChanges(discard) {
    if (discard) {
      this.resetQuestionForms();
      this.pendingDeletedQuestionIds = [];
      this.questionDrafts = {};
      this.syncQuestionDrafts(this.selectedQuestions);
      this.templateDraft = this.selectedCourse?.taskTemplateContent || '';
      this.taskVideoUrlDraft = this.selectedCourse?.youtubeUrl || '';
      this.taskDescriptionDraft = this.selectedCourse?.taskDescription || '';
      const attachment = this.selectedQuestions.find(question => question.allowFile) || this.selectedQuestions[0];
      this.taskPointsDraft = String(attachment?.points ?? 1);
      if (this.saveStatusText === 'تعذر حفظ التحضير') {
        this.attendanceChecked = attendanceSelectionFromRecords(this.selectedAttendanceRecords, this.students);
        this.saveStatusText = '';
      }
    }
    this.discardChangesDialogOpen = false;
    this.discardChangesResolve?.(discard);
    this.discardChangesResolve = null;
    this.discardChangesPromise = null;
  },
  requestCourseChange(value) { return requestWorkspaceChange(this, 'selectedCourseId', value || ''); },
  requestViewModeChange(value) { return requestWorkspaceChange(this, 'viewMode', value); },
  requestAttendanceBranchChange(value) { return requestWorkspaceChange(this, 'attendanceBranchId', value); },
  scrollToEditorQuestion(id) {
    const input = document.getElementById(id);
    input?.closest('article')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    input?.focus({ preventScroll: true });
  },
  removeNewOption(formIndex, optionIndex) {
    const patch = removeEditorOption(this.questionForms[formIndex], optionIndex);
    if (patch) { this.updateForm(formIndex, patch); this.clearFormError(formIndex); }
  },
  removeExistingOption(questionId, optionIndex) {
    const patch = removeEditorOption(this.questionDrafts[questionId], optionIndex);
    if (patch) { this.updateQuestionDraft(questionId, patch); this.clearQuestionDraftError(questionId); }
  },
  saveAttendanceNow() {
    if (!this.canEditAttendance) return;
    if (this.isSavingAttendance) return this.attendanceSavePromise;
    if (this.attendanceSaveTimer) { clearTimeout(this.attendanceSaveTimer); this.attendanceSaveTimer = null; }
    this.attendanceSavePromise = this.saveAttendance();
    return this.attendanceSavePromise;
  },
};
