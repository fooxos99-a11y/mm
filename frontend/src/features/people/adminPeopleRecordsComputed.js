const personOption = (person, loginCode) => ({
  label: `${person.name} - ${loginCode || 'بدون رقم'}`,
  value: person.id,
});

const sortArabicLabels = (left, right) => left.label.localeCompare(right.label, 'ar');

export default {
  students() {
    return Object.values(this.personRecords?.student || {});
  },
  reciters() {
    return Object.values(this.personRecords?.reciter || {});
  },
  courses() {
    return this.dashboardSnapshot?.courses || [];
  },
  attendance() {
    return this.dashboardSnapshot?.attendance || [];
  },
  submissions() {
    return this.dashboardSnapshot?.submissions || [];
  },
  selectedStudentRecord() {
    return this.students.find((student) => student.id === this.selectedStudentId) || null;
  },
  partsDialogStudent() {
    return this.students.find((student) => student.id === this.partsDialogStudentId) || null;
  },
  partsRange() {
    const limit = this.partsDialogStudent?.branchId === 'female' ? 10 : 30;
    return Array.from({ length: limit }, (_, index) => index + 1);
  },
  reciterDialogStudent() {
    return this.students.find((student) => student.id === this.reciterDialogStudentId) || null;
  },
  assignedReciterRecord() {
    if (!this.reciterDialogStudent) return null;
    return this.reciters.find((reciter) => reciter.id === this.reciterDialogStudent.reciterId) || null;
  },
  editingStudentRecord() {
    return this.students.find((student) => student.id === this.editingTargetId) || null;
  },
  editingReciterRecord() {
    return this.reciters.find((reciter) => reciter.id === this.editingTargetId) || null;
  },
  managedTargetRecord() {
    if (!this.manageTargetId) return null;
    const records = this.manageEntityType === 'student' ? this.students : this.reciters;
    return records.find((person) => person.id === this.manageTargetId) || null;
  },
  dialogTitle() {
    if (this.isEditing) return this.dialogEntityType === 'student' ? 'تعديل معلم/ة' : 'تعديل مقرئ';
    return this.dialogEntityType === 'student' ? 'إضافة معلم/ة' : 'إضافة مقرئ';
  },
  dialogTargetLabel() {
    return this.dialogEntityType === 'student' ? 'اختر المعلم/ة' : 'اختر المقرئ';
  },
  dialogNameLabel() {
    return this.dialogEntityType === 'student' ? 'اسم المعلم/ة' : 'اسم المقرئ';
  },
  dialogNamePlaceholder() {
    return this.dialogNameLabel;
  },
  manageTargetLabel() {
    return this.manageEntityType === 'student' ? 'اختر المعلم/ة' : 'اختر المقرئ';
  },
  deleteTargetName() {
    return this.deleteTarget?.name || 'المحدد';
  },
  deleteTargetTypeLabel() {
    return this.deleteTargetIsReciter ? 'المقرئ' : 'المعلم';
  },
  manageSelectMenuProps() {
    return {
      attach: '.people-manage-dialog',
      contentClass: 'people-manage-dropdown',
      offsetY: true,
      bottom: true,
      top: false,
      nudgeBottom: 8,
      closeOnClick: true,
      closeOnContentClick: true,
      maxHeight: 320,
    };
  },
  manageTargetOptions() {
    const records = this.manageEntityType === 'student' ? this.students : this.reciters;
    return records
      .filter((person) => !this.manageBranchId || person.branchId === this.manageBranchId)
      .map((person) => personOption(person, person.loginId || person.loginCode))
      .sort(sortArabicLabels);
  },
  canManageSelectedEntity() {
    return Boolean(this.managedTargetRecord);
  },
  editTargetOptions() {
    const records = this.dialogEntityType === 'student' ? this.students : this.reciters;
    return records
      .filter((person) => !this.editingBranchId || person.branchId === this.editingBranchId)
      .map((person) => personOption(person, person.loginId || person.loginCode))
      .sort(sortArabicLabels);
  },
  linkedStudentOptions() {
    return this.students
      .filter((student) => student.branchId === this.activeBranchId)
      .map((student) => ({ label: student.name, value: student.id }))
      .sort(sortArabicLabels);
  },
  reciterAssignmentOptions() {
    if (!this.reciterDialogStudent) {
      return this.canEditReciter ? [{ label: 'غير مرتبط', value: '' }] : [];
    }

    return [
      this.canEditReciter ? { label: 'غير مرتبط', value: '' } : null,
      ...this.reciters
        .filter((reciter) => reciter.branchId === this.reciterDialogStudent.branchId)
        .map((reciter) => personOption(reciter, reciter.loginCode))
        .sort(sortArabicLabels),
    ].filter(Boolean);
  },
};
