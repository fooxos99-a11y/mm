export default {
  openUsersCreateDialog() {
    if (this.activeMenu === 'users') this.$refs.workspacePanel?.openCreateDialog?.();
  },
  openUsersEditDialog() {
    if (this.activeMenu === 'users') this.$refs.workspacePanel?.openEditDialog?.();
  },
  openArchiveWorkspaceCreateDialog() {
    if (this.activeMenu === 'settings' && this.selectedSettingsItemId === 'archive') {
      this.$refs.workspacePanel?.openCreateDialog?.();
    }
  },
  openArchiveWorkspaceArchiveAllDialog() {
    if (this.activeMenu === 'settings' && this.selectedSettingsItemId === 'archive') {
      this.$refs.workspacePanel?.openArchiveAllDialog?.();
    }
  },
  openMaterialsWorkspaceCreateDialog() {
    if (this.activeMenu === 'materials') this.$refs.workspacePanel?.openCreateDialog?.();
  },
  copyRegistrationWorkspaceLink() {
    if (this.activeMenu === 'settings' && this.selectedSettingsItemId === 'registration') {
      this.$refs.workspacePanel?.copyRegistrationLink?.();
    }
  },
  openRegistrationWorkspaceFieldsDialog() {
    if (this.activeMenu === 'settings' && this.selectedSettingsItemId === 'registration') {
      this.$refs.workspacePanel?.openFieldsDialog?.();
    }
  },
  toggleRegistrationWorkspaceState() {
    if (this.activeMenu === 'settings' && this.selectedSettingsItemId === 'registration') {
      this.$refs.workspacePanel?.toggleRegistration?.();
    }
  },
  togglePermissionsWorkspaceSection() {
    if (this.activeMenu === 'settings' && this.selectedSettingsItemId === 'permissions') {
      this.$refs.workspacePanel?.togglePermissionsWorkspaceSection?.();
    }
  },
  openCompletionRequirementsDialog() {
    if (this.activeMenu === 'completion') this.$refs.workspacePanel?.openRequirementsDialog?.();
  },
  openCompletionCloseDialog() {
    if (this.activeMenu === 'completion') this.$refs.workspacePanel?.openCloseDialog?.();
  },
  handleCompletionTopbarState(payload) {
    this.completionTopbarState = {
      canEditSettings: payload?.canEditSettings === true,
      canCloseResults: payload?.canCloseResults === true,
      isClosed: payload?.isClosed === true,
    };
  },
  async handleSettingsDialogItem(itemId) {
    if (itemId === 'links') this.openLinksDialog();
    else if (itemId === 'supervision') await this.openAdminsDialog();
    else if (itemId === 'templates') this.openTemplatesDialog();
  },
  openSatisfactionWorkspaceAddDialog() {
    if (this.activeMenu === 'satisfaction') this.$refs.workspacePanel?.openAddDialog?.();
  },
  openSatisfactionWorkspaceDeleteDialog() {
    if (this.activeMenu === 'satisfaction') this.$refs.workspacePanel?.openDeleteDialog?.();
  },
  openFinalExamActivationDialog() {
    if (this.activeMenu === 'finalexam') this.$refs.workspacePanel?.openActivationDialog?.();
  },
  triggerFinalExamCopy() {
    if (this.activeMenu === 'finalexam') this.$refs.workspacePanel?.triggerCopyQuestions?.();
  },
  triggerAssessmentTopbarAction() {
    if (['courses', 'tasks'].includes(this.activeMenu)) {
      this.$refs.workspacePanel?.handleCurrentAssessmentAvailabilityAction?.();
    }
  },
};
