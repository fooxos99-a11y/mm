export default {
  async handleSaveAllQuestions() {
    if (!this.selectedCourse || this.isSaving) {
      return;
    }

    let hasError = false;
    const nextDraftErrors = {};
    const visibleQuestionIds = this.visibleSelectedQuestions.map((question) => question.id);

    visibleQuestionIds.forEach((questionId) => {
      const validationError = this.validateQuestionDraft(this.questionDrafts[questionId]);
      nextDraftErrors[questionId] = validationError;

      if (validationError) {
        hasError = true;
      }
    });

    const nextErrors = this.questionForms.map((form) => {
      const prompt = form.prompt.trim();
      const options = form.type === 'multiple'
        ? form.options.map((option) => option.trim()).filter(Boolean)
        : [];

      if (!prompt) {
        hasError = true;
        return 'أدخل السؤال.';
      }

      if (form.type === 'multiple' && options.length < 2) {
        hasError = true;
        return 'أدخل خيارين على الأقل.';
      }

      if (form.type === 'multiple' && !form.correctAnswer.trim()) {
        hasError = true;
        return 'اختر الإجابة الصحيحة.';
      }

      const points = Number(form.points);

      if (!Number.isFinite(points) || points < 0) {
        hasError = true;
        return 'أدخل درجة صحيحة.';
      }

      return '';
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
      const questions = this.visibleSelectedQuestions.map((question) => {
        const draft = this.questionDrafts[question.id];

        return {
          id: question.id,
          prompt: draft.prompt.trim(),
          type: draft.type,
          options: draft.type === 'multiple' ? draft.options.map((option) => option.trim()).filter(Boolean) : [],
          allowFile: false,
          points: Number(draft.points),
          correctAnswer: draft.type === 'multiple' ? draft.correctAnswer.trim() : '',
        };
      });

      this.questionForms.forEach((form) => {
        const options = form.type === 'multiple'
          ? form.options.map((option) => option.trim()).filter(Boolean)
          : [];

        questions.push({
          prompt: form.prompt.trim(),
          type: form.type,
          options,
          allowFile: false,
          points: Number(form.points),
          correctAnswer: form.type === 'multiple' ? form.correctAnswer.trim() : '',
        });
      });

      await this.syncCourseQuestions({
        courseId: this.selectedCourse.id,
        payload: {
          assessmentType: this.detailAssessmentType,
          questions,
          deletedQuestionIds: this.pendingDeletedQuestionIds,
          ...(this.isTasksPage ? {
            courseUpdates: {
              youtubeUrl: this.normalizeTaskVideoUrl(),
              taskDescription: this.normalizeTaskDescription(),
            },
          } : {}),
        },
      });

      this.$toast.success('تم حفظ الأسئلة بنجاح');
      this.resetQuestionForms();
      this.pendingDeletedQuestionIds = [];
    } catch (error) {
      this.$toast.error(error?.response?.data?.message || 'تعذر حفظ الأسئلة');
    } finally {
      this.isSaving = false;
    }
  },
};
