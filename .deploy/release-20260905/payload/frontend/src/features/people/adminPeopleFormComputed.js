export default {
  activeName: {
    get() {
      return this.dialogEntityType === 'student' ? this.studentForm.name : this.reciterForm.name;
    },
    set(value) {
      if (this.dialogEntityType === 'student') this.studentForm.name = value;
      else this.reciterForm.name = value;
    },
  },
  activeBranchId: {
    get() {
      return this.dialogEntityType === 'student' ? this.studentForm.branchId : this.reciterForm.branchId;
    },
    set(value) {
      if (this.dialogEntityType === 'student') this.studentForm.branchId = value;
      else this.reciterForm.branchId = value;
    },
  },
  activeLoginCode: {
    get() {
      return this.dialogEntityType === 'student' ? this.studentForm.loginId : this.reciterForm.loginCode;
    },
    set(value) {
      if (this.dialogEntityType === 'student') this.studentForm.loginId = value;
      else this.reciterForm.loginCode = value;
    },
  },
  activePassword: {
    get() {
      return this.dialogEntityType === 'student' ? this.studentForm.password : this.reciterForm.password;
    },
    set(value) {
      if (this.dialogEntityType === 'student') this.studentForm.password = value;
      else this.reciterForm.password = value;
    },
  },
  activePasswordConfirmation: {
    get() {
      return this.dialogEntityType === 'student' ? this.studentForm.passwordConfirmation : this.reciterForm.passwordConfirmation;
    },
    set(value) {
      if (this.dialogEntityType === 'student') this.studentForm.passwordConfirmation = value;
      else this.reciterForm.passwordConfirmation = value;
    },
  },
  dialogBranchId: {
    get() {
      return this.isEditing ? (this.editingBranchId || this.activeBranchId) : this.activeBranchId;
    },
    set(value) {
      if (this.isEditing) this.editingBranchId = value;
      this.activeBranchId = value;
    },
  },
};
