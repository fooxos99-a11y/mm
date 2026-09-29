import {
  createEmptyReciterForm as emptyReciterForm,
  createEmptyStudentForm as emptyStudentForm,
} from './peopleModel.mjs';


export default {
    resetForms() {
      this.studentForm = emptyStudentForm();
      this.reciterForm = emptyReciterForm();
      this.editingBranchId = '';
      this.editingTargetId = '';
      this.dialogEntityType = this.firstAvailableEntityType;
      this.isEditing = false;
      this.isDirectCardEdit = false;
      this.dialogErrors = [];
      this.dialogSubmitting = false;
    },
    resetManageDialog() {
      this.manageEntityType = this.firstAvailableEntityType;
      this.manageBranchId = this.effectiveStudentBranch;
      this.manageTargetId = '';
      this.manageDialogSubmitting = false;
    },
    populateStudentForm(student) {
      if (!student) {
        this.studentForm = emptyStudentForm();
        return;
      }

      this.studentForm = {
        name: student.name,
        loginId: student.loginId || student.loginCode || '',
        branchId: student.branchId,
        note: student.note || '',
      };
    },
    populateReciterForm(reciter) {
      if (!reciter) {
        this.reciterForm = emptyReciterForm();
        return;
      }

      this.reciterForm = {
        name: reciter.name,
        loginCode: reciter.loginCode || '',
        branchId: reciter.branchId,
        studentIds: [...(reciter.studentIds || [])],
      };
    },
    openCreateDialog() {
      if (!this.canCreateAny) {
        return;
      }

      this.resetForms();
      const prefersReciter = this.isReciterDirectoryMode && this.canAddReciter;
      this.dialogEntityType = !prefersReciter && this.canAddStudent ? 'student' : 'reciter';
      const initialBranchId = this.effectiveStudentBranch;
      this.studentForm.branchId = initialBranchId;
      this.reciterForm.branchId = initialBranchId;
      this.dialogOpen = true;
    },
    openManageDialog() {
      if (!this.availableEntityOptions.length) {
        return;
      }

      this.resetManageDialog();
      this.manageDialogOpen = true;
    },
    openEditDialog() {
      const initialStudent = this.selectedStudentRecord || null;

      this.resetForms();
      this.isEditing = true;
      this.dialogEntityType = 'student';
      this.editingBranchId = initialStudent?.branchId || (this.effectiveSelectedBranch !== 'all' ? this.effectiveSelectedBranch : '');
      this.editingTargetId = initialStudent?.id || '';
      this.populateStudentForm(initialStudent);
      this.dialogOpen = true;
    },
    openEditDialogFor(entityType, targetId, directCardEdit = true) {
      if ((entityType === 'student' && !this.canEditStudent) || (entityType === 'reciter' && !this.canEditReciter)) {
        return;
      }

      this.resetForms();
      this.isEditing = true;
      this.isDirectCardEdit = directCardEdit;
      this.dialogEntityType = entityType;
      this.editingTargetId = targetId;

      if (entityType === 'student') {
        const student = this.students.find((item) => item.id === targetId) || null;
        this.editingBranchId = student?.branchId || '';
        this.populateStudentForm(student);
      } else {
        const reciter = this.reciters.find((item) => item.id === targetId) || null;
        this.editingBranchId = reciter?.branchId || '';
        this.populateReciterForm(reciter);
      }

      this.dialogOpen = true;
    },
    handleDialogContextChange() {
      const branchId = this.dialogBranchId;
      this.editingTargetId = '';

      if (this.dialogEntityType === 'student') {
        this.populateStudentForm(null);
        this.studentForm.branchId = branchId;
      } else {
        this.populateReciterForm(null);
        this.reciterForm.branchId = branchId;
        this.reciterForm.studentIds = [];
      }
    },
    handleEditingTargetChange(targetId) {
      this.editingTargetId = targetId;

      if (this.dialogEntityType === 'student') {
        const student = this.editingStudentRecord;
        this.editingBranchId = student?.branchId || this.editingBranchId;
        this.populateStudentForm(student);
        return;
      }

      const reciter = this.editingReciterRecord;
      this.editingBranchId = reciter?.branchId || this.editingBranchId;
      this.populateReciterForm(reciter);
    },
    handleManageContextChange() {
      this.manageTargetId = '';
    },
    closeManageDialog() {
      this.manageDialogOpen = false;
      this.resetManageDialog();
    },
    openEditFromManageDialog() {
      if (!this.managedTargetRecord || this.manageDialogSubmitting) {
        return;
      }

      if ((this.manageEntityType === 'student' && !this.canEditStudent) || (this.manageEntityType === 'reciter' && !this.canEditReciter)) {
        return;
      }

      this.openEditDialogFor(this.manageEntityType, this.manageTargetId);
      this.closeManageDialog();
    },
    async submitManageDelete() {
      if (!this.managedTargetRecord || this.manageDialogSubmitting) {
        return;
      }

      if ((this.manageEntityType === 'student' && !this.canDeleteStudent) || (this.manageEntityType === 'reciter' && !this.canDeleteReciter)) {
        return;
      }

      this.manageDialogSubmitting = true;

      try {
        if (this.manageEntityType === 'student') {
          await this.deleteStudent(this.managedTargetRecord.id);

          if (this.selectedStudentId === this.managedTargetRecord.id) {
            this.selectedStudentId = '';
          }

          this.showTimedToast('success', 'تم حذف المعلم');
        } else {
          await this.deleteReciter(this.managedTargetRecord.loginCode);
          this.showTimedToast('success', 'تم حذف المقرئ');
        }

        this.closeManageDialog();
      } catch (error) {
        this.showTimedToast('error', error?.response?.data?.message || 'تعذر حذف العنصر');
        this.manageDialogSubmitting = false;
      }
    },
    toggleLinkedStudent(studentId) {
      if (this.dialogEntityType !== 'reciter') {
        return;
      }

      const selectedIds = new Set(this.reciterForm.studentIds || []);

      if (selectedIds.has(studentId)) {
        selectedIds.delete(studentId);
      } else {
        selectedIds.add(studentId);
      }

      this.reciterForm.studentIds = Array.from(selectedIds);
    },
    closeDialog() {
      this.dialogOpen = false;
      this.resetForms();
    },
};
