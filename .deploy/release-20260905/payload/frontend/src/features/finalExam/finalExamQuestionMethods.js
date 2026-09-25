import {
  applyPastedQuestionOptions, isCorrectQuestionOption, updateQuestionOption, validateQuestionDraft,
} from '../assessmentQuestions/questionModel.mjs';
import { parseImportedQuestionsFromText, splitPastedQuestionOptions } from '../../utils/questionImportParser';
import { emptyFinalExamQuestionForm as emptyQuestionForm } from './finalExamViewModel.mjs';

export const finalExamQuestionMethods = {
    removeQuestion(questionId) {
      if (!questionId || this.pendingDeletedQuestionIds.includes(questionId)) {
        return;
      }

      this.pendingDeletedQuestionIds = [...this.pendingDeletedQuestionIds, questionId];
      this.questionDraftErrors = {
        ...this.questionDraftErrors,
        [questionId]: '',
      };
    },
    handleCreateQuestionDialogChange(open) {
      this.questionDialogOpen = open;

      if (!open) {
        this.questionForms = [emptyQuestionForm()];
        this.questionErrors = [''];
        this.pasteText = '';
      }
    },
    updateQuestionForm(index, patch) {
      this.questionForms = this.questionForms.map((form, formIndex) => (formIndex === index ? { ...form, ...patch } : form));
      this.questionErrors = this.questionErrors.map((error, errorIndex) => (errorIndex === index ? '' : error));
    },
    clearQuestionError(index) {
      this.questionErrors = this.questionErrors.map((error, errorIndex) => (errorIndex === index ? '' : error));
    },
    availableAnswers(form) {
      return form.options.map((option) => option.trim()).filter(Boolean);
    },
    handleOptionChange(formIndex, optionIndex, value) {
      this.questionForms = this.questionForms.map((form, index) => (
        index === formIndex ? updateQuestionOption(form, optionIndex, value) : form
      ));
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
    selectExistingCorrectOption(questionId, optionIndex) {
      const optionValue = this.questionDrafts[questionId]?.options?.[optionIndex]?.trim() || '';

      if (!optionValue) {
        return;
      }

      this.updateQuestionDraft(questionId, { correctAnswer: optionValue, correctAnswerTouched: true });
      this.clearQuestionDraftError(questionId);
    },
    isExistingCorrectOption(questionId, option) {
      return isCorrectQuestionOption(this.questionDrafts[questionId], option);
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
      const effectiveType = preferredType === 'text' ? 'text' : draft.type;

      return {
        ...emptyQuestionForm(effectiveType),
        prompt: draft.prompt,
        type: effectiveType,
        options: effectiveType === 'multiple' ? (draft.options.length >= 2 ? draft.options : ['', '']) : [],
        points: String(defaultPoints),
        correctAnswer: '',
      };
    },
    handlePasteImport() {
      const text = this.pasteText.trim();

      if (!text) {
        return;
      }

      const rawPoints = Number(this.questionForms[0]?.points ?? '1');
      const defaultPoints = Number.isFinite(rawPoints) && rawPoints >= 0 ? rawPoints : 1;
      const preferredType = this.questionForms[0]?.type ?? 'multiple';
      const importedQuestions = parseImportedQuestionsFromText(text);

      if (!importedQuestions.length) {
        return;
      }

      this.questionForms = importedQuestions.map((question) => this.mapImportedDraftToForm(question, defaultPoints, preferredType));
      this.questionErrors = this.questionForms.map(() => '');
      this.pasteText = '';
    },
    handleBulkPaste(event) {
      const text = event.clipboardData.getData('text');

      if (!text.trim()) {
        return;
      }

      event.preventDefault();
      this.pasteText = text;
      this.handlePasteImport();
    },
    handleAddOptionField(formIndex) {
      this.questionForms = this.questionForms.map((form, index) => (index === formIndex ? { ...form, options: [...form.options, ''] } : form));
    },
    handleAddQuestionSlot(type = 'multiple') {
      this.questionForms = [...this.questionForms, emptyQuestionForm(type === 'text' ? 'text' : 'multiple')];
      this.questionErrors = [...this.questionErrors, ''];
    },
    handleRemoveQuestionSlot(index) {
      if (this.questionForms.length <= 1) {
        return;
      }

      this.questionForms = this.questionForms.filter((_, currentIndex) => currentIndex !== index);
      this.questionErrors = this.questionErrors.filter((_, currentIndex) => currentIndex !== index);
    },
    validateQuestionDraft(form) {
      return validateQuestionDraft(form);
    },
    async submitQuestions() {
      let hasError = false;
      const nextErrors = this.questionForms.map((form) => {
        const error = this.validateQuestionDraft(form);

        if (error) {
          hasError = true;
        }

        return error;
      });

      if (hasError) {
        this.questionErrors = nextErrors;
        return;
      }

      try {
        for (const form of this.questionForms) {
          const options = form.type === 'multiple'
            ? form.options.map((option) => option.trim()).filter(Boolean)
            : [];

          await this.addFinalExamQuestion({
            branchCode: this.selectedBranch,
            prompt: form.prompt.trim(),
            type: form.type,
            options,
            allowFile: false,
            points: Number(form.points || 1),
            correctAnswer: form.correctAnswer.trim(),
          });
        }

        this.$toast.success(this.questionForms.length > 1 ? 'تمت إضافة الأسئلة' : 'تمت إضافة السؤال');
        this.handleCreateQuestionDialogChange(false);
      } catch (error) {
        this.$toast.error(error?.response?.data?.message || 'تعذر إضافة السؤال');
      }
    },
    async handleSaveAllQuestions() {
      if (this.isSaving) {
        return;
      }

      let hasError = false;
      const nextDraftErrors = {};

      this.visibleBranchQuestions.forEach((question) => {
        const validationError = this.validateQuestionDraft(this.questionDrafts[question.id]);
        nextDraftErrors[question.id] = validationError;

        if (validationError) {
          hasError = true;
        }
      });

      const nextErrors = this.questionForms.map((form) => {
        const error = this.validateQuestionDraft(form);

        if (error) {
          hasError = true;
        }

        return error;
      });

      this.questionDraftErrors = {
        ...this.questionDraftErrors,
        ...nextDraftErrors,
      };

      if (hasError) {
        this.questionErrors = nextErrors;
        return;
      }

      this.isSaving = true;

      try {
        for (const question of this.visibleBranchQuestions) {
          const draft = this.questionDrafts[question.id];
          const options = draft.type === 'multiple'
            ? draft.options.map((option) => option.trim()).filter(Boolean)
            : [];

          await this.updateFinalExamQuestion({
            questionId: question.id,
            question: {
              prompt: draft.prompt.trim(),
              type: draft.type,
              options,
              allowFile: false,
              points: Number(draft.points || 1),
              correctAnswer: String(draft.correctAnswer || '').trim(),
            },
          });
        }

        for (const questionId of this.pendingDeletedQuestionIds) {
          await this.deleteFinalExamQuestion(questionId);
        }

        for (const form of this.questionForms) {
          const options = form.type === 'multiple'
            ? form.options.map((option) => option.trim()).filter(Boolean)
            : [];

          await this.addFinalExamQuestion({
            branchCode: this.selectedBranch,
            prompt: form.prompt.trim(),
            type: form.type,
            options,
            allowFile: false,
            points: Number(form.points || 1),
            correctAnswer: String(form.correctAnswer || '').trim(),
          });
        }

        this.$toast.success('تم حفظ الأسئلة بنجاح');
        this.questionForms = [emptyQuestionForm()];
        this.questionErrors = [''];
        this.pendingDeletedQuestionIds = [];
      } catch (error) {
        this.$toast.error(error?.response?.data?.message || 'تعذر حفظ الأسئلة');
      } finally {
        this.isSaving = false;
      }
    },
  selectDraftCorrectOption(formIndex, optionIndex) {
    const option = this.questionForms[formIndex]?.options?.[optionIndex]?.trim() || '';
    if (option) this.updateQuestionForm(formIndex, { correctAnswer: option, correctAnswerTouched: true });
  },
};
