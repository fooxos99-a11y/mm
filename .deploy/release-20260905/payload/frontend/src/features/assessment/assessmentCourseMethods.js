import { createEmptyQuestionForm } from '../assessmentQuestions/questionModel.mjs';


export default {
    confirmDiscardChanges() {
      if (!this.hasUnsavedAssessmentChanges || typeof window === 'undefined') return true;
      return window.confirm('لديك تغييرات غير محفوظة. هل تريد مغادرة المهمة أو الدورة دون حفظها؟');
    },
    syncSelectedCourse() {
      if (!this.hasCourseSelectionUi) {
        this.selectedCourseId = '';
        return;
      }

      if (this.resolvedCourseId && this.filteredCourses.some((course) => course.id === this.resolvedCourseId)) {
        this.selectedCourseId = this.resolvedCourseId;
        return;
      }

      if (this.filteredCourses.some((course) => course.id === this.selectedCourseId)) {
        return;
      }

      this.selectedCourseId = '';
    },
    defaultCourseSelectionId() {
      return '';
    },
    navigateBack() {
      this.$router.push({ name: 'dashboard' });
    },
    openCourseCreateDialog(mode = 'questions', questionType = '') {
      this.courseCreateTitle = '';
      this.courseCreateMode = mode;
      this.courseCreateQuestionType = questionType;
      this.courseCreateTemplateDraft = '';
      this.courseCreateVideoUrlDraft = '';
      this.courseCreateDescriptionDraft = '';
      this.courseCreateSubmitting = false;
      this.courseCreateDialogOpen = true;
    },
    closeCourseCreateDialog() {
      this.courseCreateDialogOpen = false;
      this.courseCreateTitle = '';
      this.courseCreateMode = 'questions';
      this.courseCreateQuestionType = '';
      this.courseCreateTemplateDraft = '';
      this.courseCreateVideoUrlDraft = '';
      this.courseCreateDescriptionDraft = '';
      this.courseCreateSubmitting = false;
    },
    normalizeTaskTemplateContent(value = this.templateDraft) {
      return typeof value === 'string' ? value : String(value ?? '');
    },
    normalizeTaskVideoUrl(value = this.taskVideoUrlDraft) {
      return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
    },
    normalizeTaskDescription(value = this.taskDescriptionDraft) {
      return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
    },
    async saveNewCourse() {
      const title = this.courseCreateTitle.trim();
      const taskPoints = Math.max(0, Number(this.taskPointsDraft) || 0);
      const taskCreateMode = this.courseCreateMode;
      const taskCreateQuestionType = this.courseCreateQuestionType;
      const normalizedTemplateContent = this.normalizeTaskTemplateContent(this.courseCreateTemplateDraft);
      const normalizedTaskVideoUrl = this.normalizeTaskVideoUrl(this.courseCreateVideoUrlDraft);
      const normalizedTaskDescription = this.normalizeTaskDescription(this.courseCreateDescriptionDraft);

      if (!title) {
        this.$toast.error(this.isTasksPage ? 'أدخل اسم المهمة الأدائية أولًا' : 'أدخل اسم الدورة أولًا');
        return;
      }

      this.courseCreateSubmitting = true;

      try {
        const result = await this.addCourse({
          title,
          entityType: this.isTasksPage ? 'task' : 'course',
          youtubeUrl: this.isTasksPage ? normalizedTaskVideoUrl : '',
          taskDescription: this.isTasksPage ? normalizedTaskDescription : '',
          taskMode: this.isTasksPage ? taskCreateMode : null,
          ...(this.isTasksPage && taskCreateMode === 'document' ? { taskPoints } : {}),
          ...(this.isTasksPage && taskCreateMode === 'document' ? { taskTemplateContent: normalizedTemplateContent } : {}),
        });
        const createdCourseId = result?.id || result?.course?.id || '';
        this.$toast.success(this.isTasksPage ? 'تمت إضافة المهمة الأدائية' : 'تمت إضافة الدورة');

        this.closeCourseCreateDialog();
        if (!this.isTasksPage) {
          this.viewMode = 'attendance';
        }

        this.$nextTick(() => {
          if (createdCourseId && this.filteredCourses.some((course) => course.id === createdCourseId)) {
            this.selectedCourseId = createdCourseId;

            if (this.isTasksPage && taskCreateMode === 'questions' && taskCreateQuestionType) {
              const initialQuestion = createEmptyQuestionForm({
                type: taskCreateQuestionType === 'truefalse' ? 'multiple' : taskCreateQuestionType,
                points: taskPoints,
              });
              if (taskCreateQuestionType === 'truefalse') initialQuestion.options = ['صح', 'خطأ'];
              this.questionForms = [initialQuestion];
              this.questionErrors = [''];
            }

            return;
          }

          const createdCourse = this.filteredCourses.find((course) => course.title === title);
          this.selectedCourseId = createdCourse?.id || this.selectedCourseId;
        });
      } catch (error) {
        this.$toast.error(error?.response?.data?.message || 'تعذر حفظ الدورة');
      } finally {
        this.courseCreateSubmitting = false;
      }
    },
    switchAssessmentType(type) {
      if (type === this.assessmentType) {
        return;
      }

      this.$router.push({
        name: 'admin-assessment',
        params: { assessmentType: type },
        query: this.selectedCourseId ? { courseId: this.selectedCourseId } : {},
      });
    },
    openCourseQuestions(courseId, type) {
      this.selectedCourseId = courseId;
      this.viewMode = type;
      this.selectedDetailAssessmentType = type;
    },
    openCourseAssessmentHub(courseId) {
      this.selectedCourseId = courseId;
      this.viewMode = this.isTasksPage ? this.viewMode : this.assessmentType;
      this.selectedDetailAssessmentType = this.isTasksPage ? 'tasks' : this.assessmentType;
    },
    switchDetailAssessmentType(type) {
      if (!['pre', 'post'].includes(type) || this.detailAssessmentType === type) {
        return;
      }

      this.viewMode = type;
      this.selectedDetailAssessmentType = type;
    },
    closeQuestionDetails() {
      if (this.courseIdOverride) {
        this.$emit('close-course');
        return;
      }

      this.selectedCourseId = '';
      this.selectedDetailAssessmentType = '';
    },
};
