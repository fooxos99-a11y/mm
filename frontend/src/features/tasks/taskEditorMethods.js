import {
  applyPastedQuestionOptions, updateQuestionOption, validateQuestionDraft,
} from '../assessmentQuestions/questionModel.mjs';
import { hasMeaningfulDocumentContent } from '../../utils/documentContent';
import { parseImportedQuestionsFromText, splitPastedQuestionOptions } from '../../utils/questionImportParser';
import { emptyQuestionForm, emptyTaskDraft } from './taskViewModel.mjs';

const TRUE_FALSE_OPTIONS = ['صح', 'خطأ'];

const resolveOptionsForTypeChange = (type, options) => {
  if (type === 'truefalse') return [...TRUE_FALSE_OPTIONS];
  if (type === 'multiple' && options.length > 1) return options;
  return ['', ''];
};

const resolveCorrectAnswerForTypeChange = (type, correctAnswer) => {
  if (type === 'multiple') return correctAnswer;
  if (type !== 'truefalse') return '';
  return TRUE_FALSE_OPTIONS.includes(correctAnswer) ? correctAnswer : 'صح';
};

const resolveImportedQuestionType = (preferredType, draftType) => {
  if (preferredType === 'multiple') return 'multiple';
  return preferredType === 'truefalse' && draftType === 'text' ? 'truefalse' : draftType;
};

const resolveImportedQuestionOptions = (type, options) => {
  if (type === 'truefalse') return [...TRUE_FALSE_OPTIONS];
  return options.length >= 2 ? options : ['', ''];
};

const resolveSavedQuestionOptions = (form) => {
  if (form.type === 'multiple') return form.options.map((option) => option.trim()).filter(Boolean);
  return form.type === 'truefalse' ? [...TRUE_FALSE_OPTIONS] : [];
};

export const taskEditorMethods = {
    openCreateDialog(mode) {
      this.createMode = mode;
      this.taskDraft = emptyTaskDraft();
      this.selectedTemplateId = '';
      this.draftQuestions = [];
      this.createError = '';
      this.createSubmitting = false;
      this.createDialogOpen = true;
      this.handleCreateQuestionDialogChange(false);
    },
    closeCreateDialog() {
      this.createDialogOpen = false;
      this.taskDraft = emptyTaskDraft();
      this.selectedTemplateId = '';
      this.draftQuestions = [];
      this.questionDialogOpen = false;
      this.questionForms = [emptyQuestionForm()];
      this.questionErrors = [''];
      this.pasteText = '';
      this.saveTemplateDialogOpen = false;
      this.createError = '';
      this.createSubmitting = false;
    },
    clearSelectedTemplate() {
      this.selectedTemplateId = '';
      this.taskDraft.content = '';
    },
    selectTaskTemplate(template) {
      this.selectedTemplateId = template.id;
      this.taskDraft.content = String(template.content || '');
    },
    async submitTaskCreate() {
      const title = String(this.taskDraft.title || '').trim();
      const content = String(this.taskDraft.content || '').trim();

      if (!title) {
        this.createError = 'أدخل اسم المهمة الأدائية.';
        return;
      }

      if (this.createMode === 'document' && !hasMeaningfulDocumentContent(content)) {
        this.createError = 'أدخل محتوى المهمة الأدائية.';
        return;
      }

      if (this.createMode === 'questions' && this.draftQuestions.length === 0) {
        this.createError = 'أضف سؤالًا واحدًا على الأقل قبل حفظ المهمة الأدائية.';
        return;
      }

      this.createError = '';

      if (this.createMode === 'document') {
        this.saveTemplateDialogOpen = true;
        return;
      }

      await this.finalizeTaskCreate(false);
    },
    closeSaveTemplateDialog() {
      if (this.createSubmitting) {
        return;
      }

      this.saveTemplateDialogOpen = false;
    },
    async confirmDocumentSave(shouldSaveTemplate) {
      await this.finalizeTaskCreate(shouldSaveTemplate);
    },
    async finalizeTaskCreate(shouldSaveTemplate) {
      const title = String(this.taskDraft.title || '').trim();
      const content = String(this.taskDraft.content || '').trim();

      this.createSubmitting = true;
      this.createError = '';

      try {
        let taskTemplateId = '';
        let taskTemplateName = '';

        if (this.createMode === 'document' && shouldSaveTemplate) {
          if (this.selectedTemplate) {
            taskTemplateId = this.selectedTemplate.id;
            taskTemplateName = this.selectedTemplate.name;
            await this.updateTaskTemplate({
              templateId: taskTemplateId,
              updates: {
                content,
              },
            });
          } else {
            const createdTemplate = await this.addTaskTemplate({
              name: title,
              content,
            });
            taskTemplateId = createdTemplate.id;
            taskTemplateName = createdTemplate.name;
            this.selectedTemplateId = createdTemplate.id;
          }
        }

        const created = await this.addCourse({
          title,
          isActive: false,
          entityType: 'task',
          taskMode: this.createMode,
          taskTemplateId,
          taskTemplateName,
          taskTemplateContent: this.createMode === 'document' ? content : '',
          youtubeUrl: this.createMode === 'document' ? String(this.taskDraft.youtubeUrl || '').trim() : '',
        });

        if (this.createMode === 'document') {
          await this.addQuestion({
            courseId: created.id,
            question: {
              assessmentType: 'tasks',
              prompt: 'إرفاق ملف المهمة الأدائية',
              type: 'text',
              options: [],
              allowFile: true,
              points: Number(this.taskDraft.points) || 0,
              correctAnswer: '',
            },
          });
        } else {
          for (const question of this.draftQuestions) {
            await this.addQuestion({
              courseId: created.id,
              question: {
                assessmentType: 'tasks',
                ...question,
              },
            });
          }
        }

        this.$toast.success('تم إنشاء المهمة الأدائية');
        this.closeCreateDialog();
        this.selectedTaskId = created.id;
      } catch (error) {
        this.createError = error?.response?.data?.message || 'تعذر إنشاء المهمة الأدائية';
      } finally {
        this.saveTemplateDialogOpen = false;
        this.createSubmitting = false;
      }
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
    },
    clearQuestionError(index) {
      this.questionErrors = this.questionErrors.map((error, errorIndex) => (errorIndex === index ? '' : error));
    },
    availableAnswers(form) {
      return form.options.map((option) => option.trim()).filter(Boolean);
    },
    handleQuestionTypeChange(formIndex, type) {
      this.questionForms = this.questionForms.map((form, index) => {
        if (index !== formIndex) {
          return form;
        }

        return {
          ...form,
          type,
          options: resolveOptionsForTypeChange(type, form.options),
          points: type === 'truefalse' ? '1' : form.points,
          correctAnswer: resolveCorrectAnswerForTypeChange(type, form.correctAnswer),
        };
      });
      this.clearQuestionError(formIndex);
    },
    handleOptionChange(formIndex, optionIndex, value) {
      this.questionForms = this.questionForms.map((form, index) => (
        index === formIndex ? updateQuestionOption(form, optionIndex, value) : form
      ));
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
      const effectiveType = resolveImportedQuestionType(preferredType, draft.type);

      return {
        ...emptyQuestionForm(),
        prompt: draft.prompt,
        type: effectiveType,
        options: resolveImportedQuestionOptions(effectiveType, draft.options),
        points: String(defaultPoints),
        correctAnswer: effectiveType === 'truefalse' ? 'صح' : '',
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
    handleAddQuestionSlot() {
      this.questionForms = [...this.questionForms, emptyQuestionForm()];
      this.questionErrors = [...this.questionErrors, ''];
    },
    handleRemoveQuestionSlot(index) {
      if (this.questionForms.length <= 1) {
        return;
      }

      this.questionForms = this.questionForms.filter((_, currentIndex) => currentIndex !== index);
      this.questionErrors = this.questionErrors.filter((_, currentIndex) => currentIndex !== index);
    },
    handleAddDraftQuestion() {
      let hasError = false;
      const nextErrors = this.questionForms.map((form) => {
        const error = validateQuestionDraft(form, { requireCorrectForTypes: ['multiple', 'truefalse'] });
        hasError = hasError || Boolean(error);
        return error;
      });

      if (hasError) {
        this.questionErrors = nextErrors;
        return;
      }

      const newDraftQuestions = this.questionForms.map((form) => {
        const options = resolveSavedQuestionOptions(form);

        return {
          prompt: form.prompt.trim(),
          type: form.type,
          options,
          allowFile: form.allowFile === 'yes',
          points: Number(form.points),
          correctAnswer: form.correctAnswer.trim(),
        };
      });

      this.draftQuestions = [...this.draftQuestions, ...newDraftQuestions];
      this.handleCreateQuestionDialogChange(false);
    },
    removeDraftQuestion(index) {
      this.draftQuestions = this.draftQuestions.filter((_, questionIndex) => questionIndex !== index);
    },
};
