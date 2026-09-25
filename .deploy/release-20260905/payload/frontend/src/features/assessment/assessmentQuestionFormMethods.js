import {
  applyPastedQuestionOptions,
  createEmptyQuestionForm,
  mapImportedQuestionToForm,
  updateQuestionOption,
} from '../assessmentQuestions/questionModel.mjs';
import { parseImportedQuestionsFromText, splitPastedQuestionOptions } from '../../utils/questionImportParser.js';

export default {
  resetQuestionForms() {
    this.questionForms = [];
    this.questionErrors = [];
    this.isSaving = false;
  },
  updateForm(index, patch) {
    this.questionForms = this.questionForms.map((form, formIndex) => (formIndex === index ? { ...form, ...patch } : form));
  },
  clearFormError(index) {
    this.questionErrors = this.questionErrors.map((error, errorIndex) => (errorIndex === index ? '' : error));
  },
  handleOptionChange(formIndex, optionIndex, value) {
    this.questionForms = this.questionForms.map((form, index) => (
      index === formIndex ? updateQuestionOption(form, optionIndex, value) : form
    ));
  },
  selectCorrectOption(formIndex, optionIndex) {
    const optionValue = this.questionForms[formIndex]?.options?.[optionIndex]?.trim() || '';

    if (!optionValue) {
      return;
    }

    this.updateForm(formIndex, { correctAnswer: optionValue, correctAnswerTouched: true });
    this.clearFormError(formIndex);
  },
  handleExistingOptionChange(questionId, optionIndex, value) {
    const draft = this.questionDrafts[questionId];

    if (!draft) {
      return;
    }

    this.updateQuestionDraft(questionId, updateQuestionOption(draft, optionIndex, value));
  },
  handleExistingAddOptionField(questionId) {
    const draft = this.questionDrafts[questionId];

    if (!draft) {
      return;
    }

    this.updateQuestionDraft(questionId, { options: [...draft.options, ''] });
  },
  handleExistingOptionPaste(questionId, optionIndex, event) {
    const draft = this.questionDrafts[questionId];

    if (!draft) {
      return;
    }

    const pastedOptions = splitPastedQuestionOptions(event.clipboardData.getData('text'));

    if (pastedOptions.length < 2) {
      return;
    }

    event.preventDefault();
    this.updateQuestionDraft(questionId, applyPastedQuestionOptions(draft, optionIndex, pastedOptions));
  },
  selectExistingCorrectOption(questionId, optionIndex) {
    const optionValue = this.questionDrafts[questionId]?.options?.[optionIndex]?.trim() || '';

    if (!optionValue) {
      return;
    }

    this.updateQuestionDraft(questionId, { correctAnswer: optionValue, correctAnswerTouched: true });
    this.clearQuestionDraftError(questionId);
  },
  handleExistingPromptPaste(questionId, event) {
    const draft = this.questionDrafts[questionId];

    if (!draft) {
      return;
    }

    const text = event.clipboardData.getData('text');

    if (!text.trim()) {
      return;
    }

    const importedQuestions = parseImportedQuestionsFromText(text);

    if (importedQuestions.length < 2) {
      return;
    }

    event.preventDefault();
    const rawPoints = Number(draft.points ?? '1');
    const defaultPoints = Number.isFinite(rawPoints) && rawPoints >= 0 ? rawPoints : 1;
    const preferredType = draft.type ?? 'multiple';
    const mappedQuestions = importedQuestions.map((question) => this.mapImportedDraftToForm(question, defaultPoints, preferredType));

    this.questionForms = [...this.questionForms, ...mappedQuestions];
    this.questionErrors = [...this.questionErrors, ...mappedQuestions.map(() => '')];
  },
  handleAddOptionField(formIndex) {
    this.questionForms = this.questionForms.map((form, index) => (index === formIndex ? { ...form, options: [...form.options, ''] } : form));
  },
  handleOptionPaste(formIndex, optionIndex, event) {
    const pastedOptions = splitPastedQuestionOptions(event.clipboardData.getData('text'));

    if (pastedOptions.length < 2) {
      return;
    }

    event.preventDefault();
    this.questionForms = this.questionForms.map((form, index) => {
      if (index !== formIndex) {
        return form;
      }

      return applyPastedQuestionOptions(form, optionIndex, pastedOptions);
    });
  },
  mapImportedDraftToForm(draft, defaultPoints, preferredType) {
    return mapImportedQuestionToForm(draft, defaultPoints, preferredType);
  },
  handlePromptPaste(formIndex, event) {
    const text = event.clipboardData.getData('text');

    if (!text.trim()) {
      return;
    }

    const importedQuestions = parseImportedQuestionsFromText(text);

    if (importedQuestions.length < 2) {
      return;
    }

    event.preventDefault();
    const rawPoints = Number(this.questionForms[formIndex]?.points ?? '1');
    const defaultPoints = Number.isFinite(rawPoints) && rawPoints >= 0 ? rawPoints : 1;
    const preferredType = this.questionForms[formIndex]?.type ?? 'multiple';
    const mappedQuestions = importedQuestions.map((question) => this.mapImportedDraftToForm(question, defaultPoints, preferredType));

    this.questionForms = [
      ...this.questionForms.slice(0, formIndex),
      ...mappedQuestions,
      ...this.questionForms.slice(formIndex + 1),
    ];
    this.questionErrors = [
      ...this.questionErrors.slice(0, formIndex),
      ...mappedQuestions.map(() => ''),
      ...this.questionErrors.slice(formIndex + 1),
    ];
  },
  handleAddQuestionSlot(type = 'multiple') {
    if (this.isTasksPage && !this.selectedCourse) {
      if (type === 'document') {
        this.openCourseCreateDialog('document');
        return;
      }

      this.openCourseCreateDialog('questions', type);
      return;
    }

    if (type === 'document') {
      this.switchTaskToDocumentMode();
      return;
    }

    const nextForm = createEmptyQuestionForm({
      type: type === 'truefalse' ? 'multiple' : type,
      points: this.isTasksPage ? Math.max(0, Number(this.taskPointsDraft) || 0) : 1,
    });

    if (type === 'truefalse') nextForm.options = ['صح', 'خطأ'];

    this.questionForms = [...this.questionForms, nextForm];
    this.questionErrors = [...this.questionErrors, ''];
  },
  handleTaskPointsInput(value) {
    const normalizedPoints = String(value ?? '').trim();

    this.taskPointsDraft = normalizedPoints;

    if (!this.isTasksPage || !this.isDocumentMode) {
      return;
    }

    this.questionForms = this.questionForms.map((form) => ({
      ...form,
      points: normalizedPoints,
    }));

    const updatedDrafts = { ...this.questionDrafts };

    this.visibleSelectedQuestions.forEach((question) => {
      if (!updatedDrafts[question.id]) {
        return;
      }

      updatedDrafts[question.id] = {
        ...updatedDrafts[question.id],
        points: normalizedPoints,
      };
    });

    this.questionDrafts = updatedDrafts;
  },
  handleRemoveQuestionSlot(index) {
    if (this.questionForms.length <= 1) {
      this.resetQuestionForms();
      return;
    }

    this.questionForms = this.questionForms.filter((_, currentIndex) => currentIndex !== index);
    this.questionErrors = this.questionErrors.filter((_, currentIndex) => currentIndex !== index);
  },
};
