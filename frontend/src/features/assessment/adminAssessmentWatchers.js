import { CREATE_COURSE_OPTION } from './adminAssessmentConfig';


export default {
    clockTimestamp: {
      immediate: true,
      handler(value) {
        if (Number(value) > 0) this.currentTimestamp = Number(value);
      },
    },
    managedBranchId: {
      immediate: true,
      handler(value) {
        if (!value) {
          return;
        }

        this.assessmentIndicatorsBranch = value;
        this.attendanceBranchId = value;
        this.assessmentAvailabilityBranch = value;
      },
    },
    assessmentType: {
      immediate: true,
      handler(type) {
        if (this.isTasksPage) {
          this.selectedDetailAssessmentType = 'tasks';
          return;
        }

        if (this.showUnifiedToolbar) {
          this.viewMode = 'attendance';
          this.selectedDetailAssessmentType = type;
          return;
        }

        if (type === 'pre' || type === 'post') {
          this.viewMode = type;
          this.selectedDetailAssessmentType = type;
        }
      },
    },
    assessmentTopbarState: {
      immediate: true,
      deep: true,
      handler(payload) {
        this.$emit('assessment-topbar-state', payload);
      },
    },
    indicatorAnimationSignature: {
      immediate: true,
      handler() {
        this.$nextTick(() => {
          this.restartIndicatorAnimation();
        });
      },
    },
    filteredCourses: {
      immediate: true,
      handler() {
        this.syncSelectedCourse();
      },
    },
    resolvedCourseId() {
      this.syncSelectedCourse();
    },
    selectedCourseId(newValue, oldValue) {
      if ((!this.showUnifiedToolbar && !this.isTasksPage) || newValue !== CREATE_COURSE_OPTION) {
        if (this.showUnifiedToolbar && !this.isTasksPage && newValue && newValue !== CREATE_COURSE_OPTION) {
          this.viewMode = 'attendance';
        }

        return;
      }

      this.openCourseCreateDialog();

      this.$nextTick(() => {
        this.selectedCourseId = oldValue && oldValue !== CREATE_COURSE_OPTION
          ? oldValue
          : this.defaultCourseSelectionId();
      });
    },
    viewMode: {
      immediate: true,
      handler(mode) {
        if (mode === 'pre' || mode === 'post') {
          this.selectedDetailAssessmentType = mode;
        }
      },
    },
    selectedCourse: {
      immediate: true,
      handler(course) {
        this.templateDraft = course?.taskMode === 'document' && typeof course?.taskTemplateContent === 'string'
          ? course.taskTemplateContent
          : '';
        this.taskVideoUrlDraft = typeof course?.youtubeUrl === 'string' ? course.youtubeUrl : '';
        this.taskDescriptionDraft = typeof course?.taskDescription === 'string'
          ? course.taskDescription
          : '';

        if (this.isTasksPage) {
          const attachmentQuestion = (course?.taskQuestions || []).find((question) => question.allowFile);
          this.taskPointsDraft = String((attachmentQuestion || course?.taskQuestions?.[0])?.points ?? 1);
        }
      },
    },
    selectedAttendanceRecords: {
      immediate: true,
      handler(records) {
        this.attendanceChecked = records.map((record) => {
          const student = this.students.find((item) => item.loginId === record.loginId);

          return student?.id || null;
        }).filter(Boolean);
      },
    },
    selectedQuestions: {
      immediate: true,
      handler(questions) {
        this.syncQuestionDrafts(questions);
      },
    },
};
