// Vue merges these members into the component, so `this` is the component instance.
export default /** @type {Record<string, any>} */ ({
    rolePermissions() {
      return this.dashboardSnapshot?.rolePermissions?.[this.currentUser?.role] || {};
    },
    canEditQuestions() {
      if (this.currentUser?.role === 'admin') return true;
      if (this.isTasksPage) return this.rolePermissions?.edit_tasks === true;
      if (this.detailAssessmentType === 'post') return this.rolePermissions?.edit_post_questions === true;
      return this.rolePermissions?.edit_pre_questions === true;
    },
    canManageCourseCatalog() {
      if (this.currentUser?.role === 'admin') return true;
      if (this.isTasksPage) return this.rolePermissions?.edit_tasks === true;
      return this.rolePermissions?.edit_pre_questions === true
        && this.rolePermissions?.edit_post_questions === true;
    },
    canOpenAssessment() {
      if (this.currentUser?.role === 'admin') return true;
      if (this.isTasksPage) return this.rolePermissions?.edit_tasks === true;
      if (this.currentAssessmentActionType === 'post') return this.rolePermissions?.open_post_exam === true;
      return this.rolePermissions?.open_pre_exam === true;
    },
    canEditAttendance() {
      return this.currentUser?.role === 'admin' || this.rolePermissions?.page_results === true;
    },
    routeCourseId() {
      const rawValue = this.$route.query.courseId;

      return typeof rawValue === 'string' ? rawValue.trim() : '';
    },
    resolvedCourseId() {
      return (this.courseIdOverride || '').trim() || this.routeCourseId;
    },
    currentAssessmentActionType() {
      if (this.isTasksPage) {
        return 'tasks';
      }

      return this.viewMode === 'pre' || this.viewMode === 'post'
        ? this.viewMode
        : '';
    },
    canShowAssessmentStartButton() {
      return this.canOpenAssessment && Boolean(this.selectedCourse && this.currentAssessmentActionType);
    },
    currentAssessmentActionLabel() {
      if (!this.selectedCourse || !this.currentAssessmentActionType) {
        return '';
      }

      const topbarLabel = this.currentAssessmentActionType === 'tasks'
        ? 'المهمة الأدائية'
        : (this.assessmentLabels[this.currentAssessmentActionType] || 'الاختبار');

      return this.isAssessmentActive(this.selectedCourse, this.currentAssessmentActionType)
        ? `إدارة ${topbarLabel}`
        : `بدء ${topbarLabel}`;
    },
    currentAssessmentActionClosesAt() {
      if (!this.selectedCourse || !this.currentAssessmentActionType) {
        return null;
      }

      const course = this.selectedCourse;
      const type = this.currentAssessmentActionType;
      const maleActive = this.isAssessmentBranchActive(course, type, 'male');
      const femaleActive = this.isAssessmentBranchActive(course, type, 'female');

      if (maleActive && femaleActive) {
        return this.getWindowMeta(course?.assessmentWindows?.global?.[type]).closesAt
          || this.getWindowMeta(course?.assessmentWindows?.male?.[type]).closesAt
          || this.getWindowMeta(course?.assessmentWindows?.female?.[type]).closesAt
          || null;
      }

      if (maleActive) {
        return this.getWindowMeta(course?.assessmentWindows?.male?.[type]).closesAt || null;
      }

      if (femaleActive) {
        return this.getWindowMeta(course?.assessmentWindows?.female?.[type]).closesAt || null;
      }

      return null;
    },
    currentAssessmentActionTimers() {
      if (!this.selectedCourse || !this.currentAssessmentActionType) {
        return [];
      }

      const course = this.selectedCourse;
      const type = this.currentAssessmentActionType;
      const maleActive = this.isAssessmentBranchActive(course, type, 'male');
      const femaleActive = this.isAssessmentBranchActive(course, type, 'female');

      if (!maleActive && !femaleActive) {
        return [];
      }

      if (maleActive && femaleActive) {
        const globalClosesAt = this.getWindowMeta(course?.assessmentWindows?.global?.[type]).closesAt || null;

        if (globalClosesAt) {
          return [
            { branchCode: 'male', branchLabel: this.branchLabel('male'), closesAt: globalClosesAt },
            { branchCode: 'female', branchLabel: this.branchLabel('female'), closesAt: globalClosesAt },
          ];
        }
      }

      const timers = [];

      if (maleActive) {
        const closesAt = this.getWindowMeta(course?.assessmentWindows?.male?.[type]).closesAt || null;

        if (closesAt) {
          timers.push({ branchCode: 'male', branchLabel: this.branchLabel('male'), closesAt });
        }
      }

      if (femaleActive) {
        const closesAt = this.getWindowMeta(course?.assessmentWindows?.female?.[type]).closesAt || null;

        if (closesAt) {
          timers.push({ branchCode: 'female', branchLabel: this.branchLabel('female'), closesAt });
        }
      }

      return timers;
    },
    assessmentTopbarState() {
      if (!this.embedded) {
        return {
          visible: false,
          label: '',
          type: '',
          isEnabled: false,
          closesAt: null,
          timers: [],
        };
      }

      return {
        visible: this.canShowAssessmentStartButton,
        label: this.currentAssessmentActionLabel,
        type: this.currentAssessmentActionType,
        isEnabled: this.isAssessmentActive(this.selectedCourse, this.currentAssessmentActionType),
        closesAt: this.currentAssessmentActionClosesAt,
        timers: this.currentAssessmentActionTimers,
      };
    },
});
