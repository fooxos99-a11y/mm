import { createEmptyQuestionForm } from '../assessmentQuestions/questionModel.mjs';

export const branchLabels = Object.freeze({ male: 'معلمين', female: 'معلمات' });
export const emptyTaskDraft = () => ({ title: '', points: 0, youtubeUrl: '', content: '' });
export const emptyQuestionForm = () => ({ ...createEmptyQuestionForm(), allowFile: 'no' });

export const arrayMove = (items, fromIndex, toIndex) => {
  const clone = [...items];
  const [moved] = clone.splice(fromIndex, 1);
  clone.splice(toIndex, 0, moved);
  return clone;
};

export const createAdminTasksState = () => ({
  selectedTaskId: '',
  createDialogOpen: false,
  createMode: 'questions',
  createSubmitting: false,
  createError: '',
  taskDraft: emptyTaskDraft(),
  selectedTemplateId: '',
  draftQuestions: [],
  questionDialogOpen: false,
  questionForms: [emptyQuestionForm()],
  questionErrors: [''],
  pasteText: '',
  saveTemplateDialogOpen: false,
  renameDialogOpen: false,
  renameTaskId: '',
  renameTitle: '',
  renameSubmitting: false,
  deleteDialogOpen: false,
  deletingTaskId: '',
  deleteTitle: '',
  deleteSubmitting: false,
  dragTaskId: '',
  availabilityDialogOpen: false,
  availabilityTaskId: '',
  availabilityMinutes: 60,
  availabilityBranch: 'all',
  availabilitySubmitting: false,
  availabilityError: '',
  taskSkipBranchConflict: false,
  manageDialogOpen: false,
  manageTaskId: '',
  manageChoice: '',
  manageSubmitting: false,
  branchConflictDialogOpen: false,
  branchConflict: { activeBranch: '', pendingBranch: '' },
  currentTimestamp: Date.now(),
  taskCountdownTimer: null,
});
