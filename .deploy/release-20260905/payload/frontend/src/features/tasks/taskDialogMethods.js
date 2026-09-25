export default {
  openRenameDialog(task) {
    this.renameTaskId = task.id;
    this.renameTitle = task.title || '';
    this.renameSubmitting = false;
    this.renameDialogOpen = true;
  },
  closeRenameDialog() {
    this.renameDialogOpen = false;
    this.renameTaskId = '';
    this.renameTitle = '';
    this.renameSubmitting = false;
  },
  async submitRename() {
    if (!this.renameTaskId || !String(this.renameTitle || '').trim()) return;
    this.renameSubmitting = true;
    try {
      await this.updateCourse({ courseId: this.renameTaskId, updates: { title: String(this.renameTitle || '').trim() } });
      this.$toast.success('تم تعديل اسم المهمة');
      this.closeRenameDialog();
    } catch (error) {
      this.$toast.error(error?.response?.data?.message || 'تعذر تعديل اسم المهمة');
    } finally {
      this.renameSubmitting = false;
    }
  },
  openDeleteDialog(task) {
    this.deletingTaskId = task.id;
    this.deleteTitle = task.title || '';
    this.deleteSubmitting = false;
    this.deleteDialogOpen = true;
  },
  closeDeleteDialog() {
    this.deleteDialogOpen = false;
    this.deletingTaskId = '';
    this.deleteTitle = '';
    this.deleteSubmitting = false;
  },
  async confirmDelete() {
    if (!this.deletingTaskId) return;
    const taskId = this.deletingTaskId;
    this.deleteSubmitting = true;
    try {
      await this.deleteCourse(taskId);
      if (this.selectedTaskId === taskId) this.selectedTaskId = '';
      this.$toast.success('تم حذف المهمة الأدائية');
      this.closeDeleteDialog();
    } catch (error) {
      this.$toast.error(error?.response?.data?.message || 'تعذر حذف المهمة الأدائية');
    } finally {
      this.deleteSubmitting = false;
    }
  },
  getTaskManageOptions(task) {
    const maleActive = this.isTaskBranchActive(task, 'male');
    const femaleActive = this.isTaskBranchActive(task, 'female');
    if (this.managedBranchId) {
      return maleActive || femaleActive
        ? [{ value: `close_${this.managedBranchId}`, label: `إغلاق ${this.branchLabel(this.managedBranchId)}` }]
        : [];
    }
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
        { value: 'open_female', label: 'بدء معلمات' },
        { value: 'open_all', label: 'بدء الكل' },
      ];
    }
    if (femaleActive) {
      return [
        { value: 'close_female', label: 'إغلاق معلمات' },
        { value: 'open_male', label: 'بدء معلمين' },
        { value: 'open_all', label: 'بدء الكل' },
      ];
    }

    return [
      { value: 'open_all', label: 'بدء الكل' },
      { value: 'open_male', label: 'بدء معلمين' },
      { value: 'open_female', label: 'بدء معلمات' },
    ];
  },
  openManageDialog(taskId) {
    const task = this.tasks.find((item) => item.id === taskId);
    if (!task) return;
    const options = this.getTaskManageOptions(task);
    this.manageTaskId = taskId;
    this.manageChoice = options[0]?.value || '';
    this.manageSubmitting = false;
    this.manageDialogOpen = true;
  },
  closeManageDialog() {
    this.manageDialogOpen = false;
    this.manageTaskId = '';
    this.manageChoice = '';
    this.manageSubmitting = false;
  },
  async confirmManageAction() {
    if (!this.manageTaskId || !this.manageChoice) return;
    if (this.manageChoice.startsWith('close_')) {
      this.manageSubmitting = true;
      try {
        const branch = this.manageChoice === 'close_all' ? '' : this.manageChoice.replace('close_', '');
        await this.closeTaskAvailability(this.manageTaskId, branch);
      } finally {
        this.manageSubmitting = false;
      }
      return;
    }

    const branch = this.manageChoice === 'open_all' ? 'all' : this.manageChoice.replace('open_', '');
    this.closeManageDialog();
    this.openAvailabilityDialog(this.manageTaskId, branch, true);
  },
};
