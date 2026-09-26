export default {
  getAssessmentManageOptions(course, type) {
    const maleActive = this.isAssessmentBranchActive(course, type, 'male');
    const femaleActive = this.isAssessmentBranchActive(course, type, 'female');

    if (maleActive && femaleActive) {
      return [
        { value: 'close_all', label: 'إغلاق الكل' },
        { value: 'close_male', label: 'إغلاق معلمين' },
        { value: 'close_female', label: 'إغلاق معلمات' },
      ];
    }

    if (maleActive) {
      return [
        { value: 'close_male', label: 'إغلاق معلمين' },
        { value: 'open_female', label: 'فتح معلمات' },
        { value: 'open_all', label: 'فتح الكل' },
      ];
    }

    if (femaleActive) {
      return [
        { value: 'close_female', label: 'إغلاق معلمات' },
        { value: 'open_male', label: 'فتح معلمين' },
        { value: 'open_all', label: 'فتح الكل' },
      ];
    }

    return [
      { value: 'open_all', label: 'فتح الكل' },
      { value: 'open_male', label: 'فتح معلمين' },
      { value: 'open_female', label: 'فتح معلمات' },
    ];
  },
  openAssessmentManageDialog(courseId, type) {
    const resolvedType = this.resolveActionAssessmentType(type);
    const resolvedCourseId = this.resolveDialogCourseId(courseId);
    const course = this.filteredCourses.find((item) => item.id === resolvedCourseId) || this.selectedCourse;

    if (!course) {
      return;
    }

    const options = this.getAssessmentManageOptions(course, resolvedType);
    this.assessmentManageCourseId = course.id || resolvedCourseId;
    this.assessmentManageType = resolvedType;
    this.assessmentManageChoice = options[0]?.value || '';
    this.assessmentManageSubmitting = false;
    this.assessmentManageDialogOpen = true;
  },
  closeAssessmentManageDialog() {
    this.assessmentManageDialogOpen = false;
    this.assessmentManageCourseId = '';
    this.assessmentManageType = 'pre';
    this.assessmentManageChoice = '';
    this.assessmentManageSubmitting = false;
  },
  async closeAssessmentAvailability(courseId, type, branchId = '') {
    const course = this.filteredCourses.find((item) => item.id === courseId);

    if (!course) {
      return;
    }

    const enabledKey = this.assessmentEnabledKey(type);

    try {
      if (branchId) {
        const remainingBranch = branchId === 'male' ? 'female' : 'male';
        const remainingActive = this.isAssessmentBranchActive(course, type, remainingBranch);

        await this.updateCourse({
          courseId,
          updates: {
            [enabledKey]: remainingActive,
            branchAvailability: {
              ...course.branchAvailability,
              [branchId]: {
                ...course.branchAvailability?.[branchId],
                [type]: false,
              },
            },
            assessmentWindows: {
              ...course.assessmentWindows,
              global: {
                ...course.assessmentWindows?.global,
                [type]: undefined,
              },
              [branchId]: {
                ...course.assessmentWindows?.[branchId],
                [type]: undefined,
              },
            },
          },
        });
      } else {
        await this.updateCourse({
          courseId,
          updates: {
            [enabledKey]: false,
            branchAvailability: {
              male: {
                ...course.branchAvailability?.male,
                [type]: false,
              },
              female: {
                ...course.branchAvailability?.female,
                [type]: false,
              },
            },
            assessmentWindows: {
              ...course.assessmentWindows,
              global: {
                ...course.assessmentWindows?.global,
                [type]: undefined,
              },
              male: {
                ...course.assessmentWindows?.male,
                [type]: undefined,
              },
              female: {
                ...course.assessmentWindows?.female,
                [type]: undefined,
              },
            },
          },
        });
      }

      this.$toast.success(`تم تحديث ${this.assessmentLabels[type] || 'الاختبار'}`);
      this.closeAssessmentManageDialog();
    } catch (error) {
      this.$toast.error(error?.response?.data?.message || 'تعذر تحديث حالة الاختبار');
    }
  },
  resolveActionAssessmentType(type) {
    if (this.isTasksPage) {
      return 'tasks';
    }

    if (this.embedded) {
      if (this.currentAssessmentActionType) {
        return this.currentAssessmentActionType;
      }

      if (this.detailAssessmentType === 'pre' || this.detailAssessmentType === 'post') {
        return this.detailAssessmentType;
      }
    }

    return ['pre', 'post', 'tasks'].includes(type) ? type : this.assessmentType;
  },
  resolveDialogCourseId(courseId) {
    return courseId || this.selectedCourse?.id || this.selectedCourseId || this.resolvedCourseId || '';
  },
  async confirmAssessmentManageAction() {
    if (!this.assessmentManageCourseId || !this.assessmentManageChoice) {
      return;
    }

    if (this.assessmentManageChoice.startsWith('close_')) {
      this.assessmentManageSubmitting = true;

      try {
        const branch = this.assessmentManageChoice === 'close_all' ? '' : this.assessmentManageChoice.replace('close_', '');
        await this.closeAssessmentAvailability(this.assessmentManageCourseId, this.assessmentManageType, branch);
      } finally {
        this.assessmentManageSubmitting = false;
      }

      return;
    }

    const branch = this.assessmentManageChoice === 'open_all' ? 'all' : this.assessmentManageChoice.replace('open_', '');
    this.closeAssessmentManageDialog();
    this.openAssessmentAvailabilityDialog(this.assessmentManageCourseId, this.assessmentManageType, branch, branch !== 'all');
  },
};
