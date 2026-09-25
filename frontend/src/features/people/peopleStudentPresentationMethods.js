export default {
  registrationProfileRows(profile) {
    if (!profile) return [];

    return [
      profile.loginCode ? { label: 'رقم الهوية', value: profile.loginCode } : null,
      profile.phone ? { label: 'رقم الجوال', value: profile.phone } : null,
      profile.gender ? { label: 'الجنس', value: profile.gender === 'female' ? 'أنثى' : 'ذكر' } : null,
      ...((profile.answers || []).filter((answer) => answer?.label)),
    ].filter(Boolean);
  },
  organizationLabel(person) {
    const answers = person?.registrationProfile?.answers || [];
    const compound = answers.find((answer) => answer?.label === 'اسم المجمع' && answer.value && answer.value !== 'غير محدد');
    const house = answers.find((answer) => answer?.label === 'اسم الدار' && answer.value && answer.value !== 'غير محدد');
    if (compound) return `المجمع: ${compound.value}`;

    return house ? `الدار: ${house.value}` : '';
  },
  hasPermission(key) {
    return this.isAdmin || this.managerPermissions?.[key] === true;
  },
  showTimedToast(type, message, options = {}) {
    if (this.activeToastTimer) {
      window.clearTimeout(this.activeToastTimer);
      this.activeToastTimer = null;
    }
    if (this.activeToastId !== null && typeof this.$toast.dismiss === 'function') {
      this.$toast.dismiss(this.activeToastId);
      this.activeToastId = null;
    }

    const method = typeof this.$toast?.[type] === 'function' ? this.$toast[type] : this.$toast.success;
    const timeout = typeof options.timeout === 'number' ? options.timeout : 3000;
    const toastId = method(message, { ...options, timeout });
    this.activeToastId = toastId;
    this.activeToastTimer = window.setTimeout(() => {
      if (this.activeToastId !== null && typeof this.$toast.dismiss === 'function') this.$toast.dismiss(this.activeToastId);
      this.activeToastId = null;
      this.activeToastTimer = null;
    }, timeout);
  },
  handleDialogToggle(value) {
    if (value || this.bulkFilePickerOpen) {
      this.dialogOpen = true;
      return;
    }
    this.closeDialog();
  },
  handlePartsDialogToggle(value) {
    if (value) this.partsDialogOpen = true;
    else this.closePartsDialog();
  },
  handleReciterDialogToggle(value) {
    if (value) this.reciterDialogOpen = true;
    else this.closeReciterDialog();
  },
  handleManageDialogToggle(value) {
    if (value) this.manageDialogOpen = true;
    else this.closeManageDialog();
  },
  handleDeleteDialogToggle(value) {
    if (value) this.deleteDialogOpen = true;
    else this.closeDeleteDialog();
  },
  handleBranchFilterChange() {
    if (this.isReciterDirectoryMode) this.selectedFilter = 'all';
  },
  selectStudent(studentId) {
    this.selectedStudentId = studentId;
  },
};
