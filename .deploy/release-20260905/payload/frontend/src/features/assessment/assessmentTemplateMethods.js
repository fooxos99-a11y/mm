

export default {
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
    async saveTemplate() {
      if (!this.selectedCourse) {
        return;
      }

      this.templateSaving = true;

      try {
        const normalizedTemplateContent = this.normalizeTaskTemplateContent();
        const normalizedTaskVideoUrl = this.normalizeTaskVideoUrl();
        const normalizedTaskDescription = this.normalizeTaskDescription();
        const attachmentQuestion = this.selectedQuestions.find((question) => question.allowFile) || this.selectedQuestions[0] || null;

        await this.syncCourseQuestions({
          courseId: this.selectedCourse.id,
          payload: {
            assessmentType: 'tasks',
            questions: [{
              ...(attachmentQuestion?.id ? { id: attachmentQuestion.id } : {}),
              prompt: 'إرفاق ملف المهمة الأدائية',
              type: 'text',
              options: [],
              allowFile: true,
              points: Number(this.taskPointsDraft),
              correctAnswer: '',
              attachmentName: attachmentQuestion?.attachmentName || '',
              attachmentType: attachmentQuestion?.attachmentType || '',
              attachmentDataUrl: attachmentQuestion?.attachmentDataUrl || '',
            }],
            deletedQuestionIds: [],
            courseUpdates: {
              taskTemplateContent: normalizedTemplateContent,
              youtubeUrl: normalizedTaskVideoUrl,
              taskDescription: normalizedTaskDescription,
            },
          },
        });
        this.$toast.success('تم حفظ إعدادات المهمة بنجاح');
      } catch (error) {
        this.$toast.error(error?.response?.data?.message || 'تعذر حفظ إعدادات المهمة');
      } finally {
        this.templateSaving = false;
      }
    },
    async switchTaskToDocumentMode() {
      if (!this.isTasksPage || !this.selectedCourse) {
        return;
      }

      this.templateSaving = true;

      try {
        const normalizedTemplateContent = this.normalizeTaskTemplateContent();
        const normalizedTaskVideoUrl = this.normalizeTaskVideoUrl();
        const normalizedTaskDescription = this.normalizeTaskDescription();
        const attachmentQuestion = this.selectedQuestions.find((question) => question.allowFile);
        await this.syncCourseQuestions({
          courseId: this.selectedCourse.id,
          payload: {
            assessmentType: 'tasks',
            questions: [{
              ...(attachmentQuestion?.id ? { id: attachmentQuestion.id } : {}),
              prompt: 'إرفاق ملف المهمة الأدائية',
              type: 'text',
              options: [],
              allowFile: true,
              points: Math.max(0, Number(this.taskPointsDraft) || 0),
              correctAnswer: '',
              attachmentName: attachmentQuestion?.attachmentName || '',
              attachmentType: attachmentQuestion?.attachmentType || '',
              attachmentDataUrl: attachmentQuestion?.attachmentDataUrl || '',
            }],
            deletedQuestionIds: [],
            courseUpdates: {
              taskMode: 'document',
              taskTemplateContent: normalizedTemplateContent,
              youtubeUrl: normalizedTaskVideoUrl,
              taskDescription: normalizedTaskDescription,
            },
          },
        });

        this.resetQuestionForms();
        this.$toast.success('تم تحويل المهمة إلى وورد');
      } catch (error) {
        this.$toast.error(error?.response?.data?.message || 'تعذر تحويل المهمة إلى وورد');
      } finally {
        this.templateSaving = false;
      }
    },
};
