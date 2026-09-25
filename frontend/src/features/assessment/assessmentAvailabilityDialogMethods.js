export default {
  openAssessmentAvailabilityDialog(courseId, type, branch = 'all', preserveActiveBranches = false) {
    const resolvedType = this.resolveActionAssessmentType(type);
    const resolvedCourseId = this.resolveDialogCourseId(courseId);
    const course = this.filteredCourses.find((item) => item.id === resolvedCourseId) || this.selectedCourse;
    const currentWindow = branch === 'all'
      ? this.getWindowMeta(course?.assessmentWindows?.global?.[resolvedType])
      : this.getWindowMeta(course?.assessmentWindows?.[branch]?.[resolvedType]);

    this.assessmentAvailabilityCourseId = course?.id || resolvedCourseId;
    this.assessmentAvailabilityType = resolvedType;
    this.assessmentAvailabilityBranch = this.managedBranchId || branch;
    this.assessmentAvailabilityPreserveActiveBranches = preserveActiveBranches;
    this.assessmentAvailabilityMinutes = Number(currentWindow.durationMinutes) > 0 ? Number(currentWindow.durationMinutes) : 60;
    this.assessmentAvailabilitySubmitting = false;
    this.assessmentAvailabilityDialogOpen = true;
  },
  closeAssessmentAvailabilityDialog() {
    this.assessmentAvailabilityDialogOpen = false;
    this.assessmentAvailabilityCourseId = '';
    this.assessmentAvailabilityType = 'pre';
    this.assessmentAvailabilityBranch = this.managedBranchId || 'all';
    this.assessmentAvailabilityPreserveActiveBranches = false;
    this.assessmentAvailabilityMinutes = 60;
    this.assessmentAvailabilitySubmitting = false;
  },
  async confirmAssessmentAvailability() {
    const course = this.filteredCourses.find((item) => item.id === this.assessmentAvailabilityCourseId) || this.selectedCourse;
    const durationMinutes = Number(this.assessmentAvailabilityMinutes);
    const targetBranch = this.managedBranchId || this.assessmentAvailabilityBranch;

    if (!course) {
      this.$toast.error('تعذر تحديد الدورة الحالية. أعد اختيار الدورة ثم حاول مرة أخرى.');
      return;
    }

    if (!Number.isFinite(durationMinutes) || durationMinutes < 1) {
      this.$toast.error('أدخل مدة صحيحة بالدقائق');
      return;
    }

    if (!targetBranch) {
      this.$toast.error('اختر الفرع');
      return;
    }

    const now = new Date();
    const closesAt = new Date(now.getTime() + (durationMinutes * 60 * 1000)).toISOString();
    const windowPayload = {
      opensAt: now.toISOString(),
      closesAt,
      durationMinutes,
    };
    const targetBranches = targetBranch === 'all' ? ['male', 'female'] : [targetBranch];
    const otherBranches = ['male', 'female'].filter((branchId) => !targetBranches.includes(branchId));
    const branchAvailability = {
      male: { ...(course.branchAvailability?.male || {}) },
      female: { ...(course.branchAvailability?.female || {}) },
    };
    const nextWindows = {
      global: { ...(course.assessmentWindows?.global || {}) },
      male: { ...(course.assessmentWindows?.male || {}) },
      female: { ...(course.assessmentWindows?.female || {}) },
    };

    nextWindows.global[this.assessmentAvailabilityType] = targetBranch === 'all' ? windowPayload : undefined;

    targetBranches.forEach((branchId) => {
      branchAvailability[branchId] = {
        ...branchAvailability[branchId],
        [this.assessmentAvailabilityType]: true,
      };
      nextWindows[branchId] = {
        ...nextWindows[branchId],
        [this.assessmentAvailabilityType]: windowPayload,
      };
    });

    otherBranches.forEach((branchId) => {
      const shouldPreserve = this.assessmentAvailabilityPreserveActiveBranches && this.isAssessmentBranchActive(course, this.assessmentAvailabilityType, branchId);

      branchAvailability[branchId] = {
        ...branchAvailability[branchId],
        [this.assessmentAvailabilityType]: shouldPreserve,
      };
      nextWindows[branchId] = {
        ...nextWindows[branchId],
        [this.assessmentAvailabilityType]: shouldPreserve ? nextWindows[branchId]?.[this.assessmentAvailabilityType] : undefined,
      };
    });

    const nextSettings = course.isActive
      ? {
        pre: course.isPreEnabled,
        post: course.isPostEnabled,
        tasks: course.isTasksEnabled,
      }
      : { pre: false, post: false, tasks: false };

    nextSettings[this.assessmentAvailabilityType] = true;
    this.assessmentAvailabilitySubmitting = true;

    try {
      const openingTask = this.assessmentAvailabilityType === 'tasks';

      await this.updateCourse({
        courseId: course.id,
        updates: {
          branchAvailability,
          assessmentWindows: nextWindows,
          ...(openingTask ? { isActive: true, isTasksEnabled: true } : {}),
        },
      });
      if (!openingTask) {
        await this.activateCourse({
          courseId: course.id,
          settings: nextSettings,
        });
      }
      this.$toast.success(`تم فتح ${this.availabilityDialogLabel}`);
      this.closeAssessmentAvailabilityDialog();
    } catch (error) {
      this.$toast.error(error?.response?.data?.message || 'تعذر فتح الاختبار');
    } finally {
      this.assessmentAvailabilitySubmitting = false;
    }
  },
};
