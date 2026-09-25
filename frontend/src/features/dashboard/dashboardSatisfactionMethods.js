export default {
  getSatisfactionQuestionKey(question) {
    return `${question.prompt}::${question.type}`;
  },
  ensureSatisfactionCourseSelection() {
    const [firstCourse] = this.satisfactionCourseOptions;
    if (!this.selectedSatisfactionCourseId
      || !this.satisfactionCourseOptions.some((course) => course.value === this.selectedSatisfactionCourseId)) {
      this.selectedSatisfactionCourseId = firstCourse?.value || '';
    }
    if (!this.selectedSatisfactionDeleteKey
      || !this.satisfactionQuestionOptions.some((question) => question.value === this.selectedSatisfactionDeleteKey)) {
      this.selectedSatisfactionDeleteKey = this.satisfactionQuestionOptions[0]?.value || '';
    }
  },
  openSatisfactionAddDialog() {
    this.satisfactionQuestionDraft = { prompt: '', type: 'rating', isRequired: true };
    this.satisfactionAddDialogOpen = true;
  },
  closeSatisfactionAddDialog() {
    this.satisfactionAddDialogOpen = false;
    this.satisfactionSubmitting = false;
  },
  openSatisfactionDeleteDialog() {
    this.ensureSatisfactionCourseSelection();
    this.satisfactionDeleteDialogOpen = true;
  },
  closeSatisfactionDeleteDialog() {
    this.satisfactionDeleteDialogOpen = false;
    this.satisfactionDeleting = false;
  },
  async submitSatisfactionQuestion() {
    if (!this.satisfactionQuestionDraft.prompt) {
      this.$toast.error('أدخل نص السؤال أولًا');
      return;
    }
    this.satisfactionSubmitting = true;
    try {
      await this.addSatisfactionQuestion({
        prompt: this.satisfactionQuestionDraft.prompt,
        type: this.satisfactionQuestionDraft.type,
        isRequired: this.satisfactionQuestionDraft.isRequired,
      });
      this.$toast.success('تمت إضافة سؤال الاستبيان');
      this.closeSatisfactionAddDialog();
    } catch (error) {
      this.$toast.error(error?.response?.data?.message || 'تعذر إضافة سؤال الاستبيان');
    } finally {
      this.satisfactionSubmitting = false;
    }
  },
  async confirmDeleteSatisfactionQuestion() {
    const questionIds = this.selectedSatisfactionDeleteQuestions.map((question) => question.id);
    if (!questionIds.length) {
      this.$toast.error('اختر سؤالًا صالحًا للحذف');
      return;
    }
    this.satisfactionDeleting = true;
    try {
      await this.deleteSatisfactionQuestions(questionIds);
      this.$toast.success('تم حذف سؤال الاستبيان');
      this.closeSatisfactionDeleteDialog();
    } catch (error) {
      this.$toast.error(error?.response?.data?.message || 'تعذر حذف سؤال الاستبيان');
    } finally {
      this.satisfactionDeleting = false;
    }
  },
};
