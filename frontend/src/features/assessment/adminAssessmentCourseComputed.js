import { CREATE_COURSE_OPTION } from './adminAssessmentConfig';
import { hasQuestionSetChanges } from '../assessmentQuestions/questionModel.mjs';
import { stripRichTextMarkup } from '../../utils/documentContent';

const comparableTaskTemplate = value => stripRichTextMarkup(value) || /<(?:img|table|hr)\b/i.test(value) ? value : '';

// Vue merges these members into the component, so `this` is the component instance.
export default /** @type {Record<string, any>} */ ({
    assessmentType() {
      const value = this.assessmentTypeOverride || this.$route.params.assessmentType;

      return ['pre', 'post', 'tasks'].includes(value) ? value : 'pre';
    },
    isTasksPage() {
      return this.assessmentType === 'tasks';
    },
    showUnifiedToolbar() {
      return this.embedded && !this.isTasksPage;
    },
    isIndicatorsMode() {
      return this.showUnifiedToolbar && this.viewMode === 'indicators';
    },
    isAttendanceMode() {
      return this.showUnifiedToolbar && this.viewMode === 'attendance';
    },
    managedBranchId() {
      if (this.currentUser?.role === 'male_manager') {
        return 'male';
      }

      if (this.currentUser?.role === 'female_manager') {
        return 'female';
      }

      return '';
    },
    courseModeOptions() {
      const options = [
        { label: 'التحضير', value: 'attendance' },
        { label: 'الاختبار القبلي', value: 'pre' },
        { label: 'الاختبار البعدي', value: 'post' },
      ];

      if (this.filteredCourses.length) {
        options.push({ label: 'المؤشرات', value: 'indicators' });
      }

      return options;
    },
    coursePlaceholderLabel() {
      return this.isTasksPage ? 'اختر المهمة' : 'اختر الدورة';
    },
    hasCourseSelectionUi() {
      return this.filteredCourses.length > 0 || this.canManageCourseCatalog;
    },
    courseToolbarProps() {
      return {
        isTasksPage: this.isTasksPage,
        courseValue: this.courseSelectValue,
        courseOptions: this.courseSelectOptions,
        coursePlaceholder: this.coursePlaceholderLabel,
        canEdit: this.canManageCourseCatalog,
        deletingCourseId: this.deletingCourseId,
        viewMode: this.viewMode,
        changingContext: this.isChangingAssessmentContext,
        modeOptions: this.courseModeOptions,
        selectedCourse: this.selectedCourse,
        isDocumentMode: this.isDocumentMode,
        taskPoints: this.taskPointsDraft,
        taskVideoUrl: this.taskVideoUrlDraft,
        taskDescription: this.taskDescriptionDraft,
      };
    },
    filteredCourses() {
      const allCourses = this.dashboardSnapshot?.courses || [];

      return allCourses.filter((course) => (this.isTasksPage ? course.entityType === 'task' : course.entityType !== 'task'));
    },
    courseSelectOptions() {
      const options = this.filteredCourses.map((course) => ({
        label: course.title,
        value: course.id,
        course,
      }));

      if (this.canManageCourseCatalog) {
        options.push({
          label: this.isTasksPage ? 'إضافة مهمة أدائية جديدة' : 'إضافة دورة جديدة',
          value: CREATE_COURSE_OPTION,
        });
      }

      return options;
    },
    courseSelectValue: {
      get() {
        return this.selectedCourseId || null;
      },
      set(value) {
        this.requestCourseChange(value || '');
      },
    },
    selectedCourse() {
      return this.filteredCourses.find((course) => course.id === this.selectedCourseId) || null;
    },
    selectedQuestions() {
      if (!this.selectedCourse) {
        return [];
      }

      if (!this.detailAssessmentType) {
        return [];
      }

      if (this.detailAssessmentType === 'pre') {
        return this.selectedCourse.preQuestions || [];
      }

      if (this.detailAssessmentType === 'post') {
        return this.selectedCourse.postQuestions || [];
      }

      return this.selectedCourse.taskQuestions || [];
    },
    visibleSelectedQuestions() {
      return this.selectedQuestions.filter((question) => !this.pendingDeletedQuestionIds.includes(question.id));
    },
    hasUnsavedAssessmentChanges() {
      return Boolean(this.questionForms.length || this.hasAssessmentChanges);
    },
    hasAssessmentChanges() {
      if (!this.selectedCourse) return false;
      const questionChanged = hasQuestionSetChanges({
        questions: this.visibleSelectedQuestions, drafts: this.questionDrafts,
        forms: this.questionForms, deletedIds: this.pendingDeletedQuestionIds,
      });

      if (questionChanged || !this.isTasksPage) return questionChanged;

      const metadataChanged = this.normalizeTaskVideoUrl() !== String(this.selectedCourse.youtubeUrl || '').trim()
        || this.normalizeTaskDescription() !== String(this.selectedCourse.taskDescription || '').trim();

      if (!this.isDocumentMode) return metadataChanged;

      const attachmentQuestion = this.selectedQuestions.find((question) => question.allowFile) || this.selectedQuestions[0];
      return metadataChanged
        || comparableTaskTemplate(this.normalizeTaskTemplateContent()) !== comparableTaskTemplate(String(this.selectedCourse.taskTemplateContent || ''))
        || Number(this.taskPointsDraft) !== Number(attachmentQuestion?.points ?? 1);
    },
    submissions() {
      return this.dashboardSnapshot?.submissions || [];
    },
    attendance() {
      return this.dashboardSnapshot?.attendance || [];
    },
    students() {
      return this.dashboardSnapshot?.students || [];
    },
    detailAssessmentType() {
      return this.selectedDetailAssessmentType || this.assessmentType;
    },
    isDocumentMode() {
      return this.isTasksPage && this.selectedCourse?.taskMode === 'document';
    },
    showQuestionDetails() {
      return Boolean(this.selectedCourseId);
    },
    availabilityDialogLabel() {
      return this.assessmentLabels[this.assessmentAvailabilityType] || 'الاختبار';
    },
    assessmentManageDialogLabel() {
      return this.assessmentLabels[this.assessmentManageType] || 'الاختبار';
    },
    currentAssessmentManageCourse() {
      return this.filteredCourses.find((course) => course.id === this.assessmentManageCourseId) || null;
    },
    currentAssessmentManageOptions() {
      if (!this.currentAssessmentManageCourse) {
        return [];
      }

      return this.getAssessmentManageOptions(this.currentAssessmentManageCourse, this.assessmentManageType);
    },
});
