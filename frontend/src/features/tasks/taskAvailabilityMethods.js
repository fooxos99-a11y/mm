export default {
  handleTaskAvailabilityAction(task) {
    if (!this.canManage) return;
    if (!this.isTaskActive(task)) {
      this.openAvailabilityDialog(task.id, this.managedBranchId || 'all', false);
      return;
    }
    if (this.managedBranchId) {
      this.closeTaskAvailability(task.id, this.managedBranchId);
      return;
    }
    this.openManageDialog(task.id);
  },
  openAvailabilityDialog(taskId, branch = 'all', skipConflict = false) {
    const task = this.tasks.find((item) => item.id === taskId);
    const sourceWindow = branch === 'all'
      ? this.getWindowMeta(task?.assessmentWindows?.global?.tasks)
      : this.getWindowMeta(task?.assessmentWindows?.[branch]?.tasks);
    this.availabilityTaskId = taskId;
    this.availabilityBranch = this.managedBranchId || branch || 'all';
    this.availabilityMinutes = sourceWindow.durationMinutes > 0 ? sourceWindow.durationMinutes : 60;
    this.availabilityError = '';
    this.availabilitySubmitting = false;
    this.taskSkipBranchConflict = skipConflict;
    this.availabilityDialogOpen = true;
  },
  closeAvailabilityDialog() {
    this.availabilityDialogOpen = false;
    this.availabilityTaskId = '';
    this.availabilityMinutes = 60;
    this.availabilityBranch = this.managedBranchId || 'all';
    this.availabilitySubmitting = false;
    this.availabilityError = '';
    this.taskSkipBranchConflict = false;
  },
  async confirmTaskAvailability(skipBranchConflictCheck = false) {
    const task = this.tasks.find((item) => item.id === this.availabilityTaskId);
    const duration = Number(this.availabilityMinutes);
    const targetBranch = this.managedBranchId || this.availabilityBranch;
    const shouldBypassBranchConflict = skipBranchConflictCheck || this.taskSkipBranchConflict;
    if (!task || !Number.isFinite(duration) || duration <= 0) {
      this.availabilityError = 'أدخل مدة صحيحة بالدقائق.';
      return;
    }
    if (!targetBranch) {
      this.availabilityError = 'اختر فرعًا.';
      return;
    }
    if (targetBranch !== 'all') {
      const otherBranch = targetBranch === 'male' ? 'female' : 'male';
      if (this.isTaskBranchActive(task, otherBranch) && !shouldBypassBranchConflict && !this.managedBranchId) {
        this.branchConflict = { activeBranch: otherBranch, pendingBranch: targetBranch };
        this.branchConflictDialogOpen = true;
        return;
      }
    }

    this.branchConflictDialogOpen = false;
    const targetBranches = targetBranch === 'all' ? ['male', 'female'] : [targetBranch];
    const otherBranches = ['male', 'female'].filter((branchId) => !targetBranches.includes(branchId));
    const closesAt = new Date(Date.now() + duration * 60 * 1000).toISOString();
    const existingGlobalClose = this.getWindowMeta(task.assessmentWindows?.global?.tasks).closesAt;
    const nextGlobalClose = !existingGlobalClose || new Date(existingGlobalClose) < new Date(closesAt) ? closesAt : existingGlobalClose;
    const branchAvailability = {
      male: { ...task.branchAvailability?.male },
      female: { ...task.branchAvailability?.female },
    };
    const assessmentWindows = {
      global: { ...task.assessmentWindows?.global, tasks: nextGlobalClose },
      male: { ...task.assessmentWindows?.male },
      female: { ...task.assessmentWindows?.female },
    };
    targetBranches.forEach((branchId) => {
      branchAvailability[branchId] = { ...branchAvailability[branchId], tasks: true };
      assessmentWindows[branchId] = { ...assessmentWindows[branchId], tasks: closesAt };
    });
    otherBranches.forEach((branchId) => {
      if (targetBranch === 'all') {
        assessmentWindows[branchId] = { ...assessmentWindows[branchId], tasks: closesAt };
        branchAvailability[branchId] = { ...branchAvailability[branchId], tasks: true };
        return;
      }

      const keepsActiveBranch = shouldBypassBranchConflict && this.isTaskBranchActive(task, branchId);
      assessmentWindows[branchId] = {
        ...assessmentWindows[branchId],
        tasks: keepsActiveBranch ? assessmentWindows[branchId].tasks : undefined,
      };
      if (!keepsActiveBranch) {
        branchAvailability[branchId] = { ...branchAvailability[branchId], tasks: false };
      }
    });

    this.availabilitySubmitting = true;
    this.availabilityError = '';
    try {
      await this.updateCourse({ courseId: task.id, updates: { isTasksEnabled: true, branchAvailability, assessmentWindows } });
      const otherActiveTasks = this.tasks.filter((item) => item.id !== task.id && item.isTasksEnabled);
      await Promise.all(otherActiveTasks.map((item) => this.updateCourse({
        courseId: item.id,
        updates: {
          isTasksEnabled: false,
          assessmentWindows: {
            ...item.assessmentWindows,
            global: { ...item.assessmentWindows?.global, tasks: undefined },
            male: { ...item.assessmentWindows?.male, tasks: undefined },
            female: { ...item.assessmentWindows?.female, tasks: undefined },
          },
        },
      }).catch(() => undefined)));
      this.$toast.success('تم فتح المهمة الأدائية');
      this.closeAvailabilityDialog();
    } catch (error) {
      this.availabilityError = error?.response?.data?.message || 'تعذر فتح المهمة الأدائية';
    } finally {
      this.availabilitySubmitting = false;
    }
  },
  closeBranchConflictDialog() {
    this.branchConflictDialogOpen = false;
    this.branchConflict = { activeBranch: '', pendingBranch: '' };
  },
  async closeTaskAvailability(taskId, branchId = '') {
    const task = this.tasks.find((item) => item.id === taskId);
    if (!task) return;
    try {
      if (branchId) {
        const remainingBranch = branchId === 'male' ? 'female' : 'male';
        const remainingBranchActive = this.isTaskBranchActive(task, remainingBranch);
        await this.updateCourse({
          courseId: task.id,
          updates: {
            isTasksEnabled: remainingBranchActive,
            branchAvailability: {
              ...task.branchAvailability,
              [branchId]: { ...task.branchAvailability?.[branchId], tasks: false },
            },
            assessmentWindows: {
              ...task.assessmentWindows,
              global: {
                ...task.assessmentWindows?.global,
                tasks: remainingBranchActive ? this.getWindowMeta(task.assessmentWindows?.global?.tasks).closesAt : undefined,
              },
              [branchId]: { ...task.assessmentWindows?.[branchId], tasks: undefined },
            },
          },
        });
      } else {
        await this.updateCourse({
          courseId: task.id,
          updates: {
            isTasksEnabled: false,
            assessmentWindows: {
              ...task.assessmentWindows,
              global: { ...task.assessmentWindows?.global, tasks: undefined },
              male: { ...task.assessmentWindows?.male, tasks: undefined },
              female: { ...task.assessmentWindows?.female, tasks: undefined },
            },
          },
        });
      }
      this.$toast.success('تم تحديث حالة المهمة الأدائية');
      this.closeManageDialog();
    } catch (error) {
      this.$toast.error(error?.response?.data?.message || 'تعذر تحديث حالة المهمة الأدائية');
    }
  },
};
