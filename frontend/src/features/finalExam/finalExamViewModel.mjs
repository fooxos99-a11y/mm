import { createEmptyQuestionForm } from '../assessmentQuestions/questionModel.mjs';

export const emptyFinalExamQuestionForm = (type = 'multiple') => ({
  ...createEmptyQuestionForm({ type }),
  allowFile: 'no',
});

export const createFinalExamState = () => ({
  selectedBranch: '', indicatorBranch: 'male', isEnabled: false, openDurationMinutes: 60,
  questionDialogOpen: false, copyDialogOpen: false, activationDialogOpen: false,
  copySubmitting: false, activationSubmitting: false, activationError: '', activationBranch: 'male',
  activationPreserveOtherBranch: false, manageDialogOpen: false, manageChoice: '', manageSubmitting: false,
  isSaving: false, questionForms: [], questionErrors: [], questionDrafts: {}, questionDraftErrors: {},
  pendingDeletedQuestionIds: [], pasteText: '', currentTimestamp: Date.now(), countdownTimer: null,
  branchOptions: [{ label: 'معلمين', value: 'male' }, { label: 'معلمات', value: 'female' }],
  questionTypeOptions: [{ label: 'اختيارات', value: 'multiple' }, { label: 'نصي', value: 'text' }],
});
