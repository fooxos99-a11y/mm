const RECITER_DIRECTORY_BRANCHES = {
  'reciters-male': 'male',
  'reciters-female': 'female',
};

const resolveStudentBranch = (branchId) => {
  if (Object.hasOwn(RECITER_DIRECTORY_BRANCHES, branchId)) return RECITER_DIRECTORY_BRANCHES[branchId];
  return branchId;
};

export default {
  isAdmin() {
    return this.currentUser?.role === 'admin';
  },
  managerPermissions() {
    return this.dashboardSnapshot?.rolePermissions?.[this.currentUser?.role] || {};
  },
  canAddStudent() {
    return this.hasPermission('add_student');
  },
  canEditStudent() {
    return this.hasPermission('edit_student');
  },
  canDeleteStudent() {
    return this.hasPermission('delete_student');
  },
  canAddReciter() {
    return this.hasPermission('add_reciter');
  },
  canEditReciter() {
    return this.hasPermission('edit_reciter');
  },
  canDeleteReciter() {
    return this.hasPermission('delete_reciter');
  },
  canAssignReciter() {
    return this.hasPermission('transfer_reciter_student') || this.canEditReciter;
  },
  canCreateAny() {
    return this.canAddStudent || this.canAddReciter;
  },
  canEditVisiblePeople() {
    return this.isReciterDirectoryMode ? this.canEditReciter : this.canEditStudent;
  },
  canDeleteVisiblePeople() {
    return this.isReciterDirectoryMode ? this.canDeleteReciter : this.canDeleteStudent;
  },
  availableEntityOptions() {
    return [
      (this.canAddStudent || this.canEditStudent || this.canDeleteStudent) ? { label: 'معلم/ة', value: 'student' } : null,
      (this.canAddReciter || this.canEditReciter || this.canDeleteReciter) ? { label: 'مقرئ', value: 'reciter' } : null,
    ].filter(Boolean);
  },
  firstAvailableEntityType() {
    return this.availableEntityOptions[0]?.value || 'student';
  },
  managedBranchId() {
    if (this.currentUser?.role === 'male_manager') return 'male';
    if (this.currentUser?.role === 'female_manager') return 'female';
    return '';
  },
  effectiveSelectedBranch() {
    return this.managedBranchId || this.selectedBranch;
  },
  isReciterDirectoryMode() {
    return ['reciters-male', 'reciters-female'].includes(this.effectiveSelectedBranch);
  },
  effectiveStudentBranch() {
    return resolveStudentBranch(this.effectiveSelectedBranch);
  },
  filterOptions() {
    if (this.isReciterDirectoryMode) {
      return this.baseFilterOptions.filter((option) => option.value === 'all');
    }
    return this.baseFilterOptions;
  },
  canManageStudentParts() {
    return this.isAdmin || this.currentUser?.role === 'reciter' || this.canEditStudent;
  },
  branchFilterOptions() {
    if (this.managedBranchId) {
      return this.branchOptions.filter((option) => option.value === this.managedBranchId);
    }
    return [
      ...this.branchOptions,
      { label: 'مقرئين', value: 'reciters-male' },
      { label: 'مقرئات', value: 'reciters-female' },
    ];
  },
};
