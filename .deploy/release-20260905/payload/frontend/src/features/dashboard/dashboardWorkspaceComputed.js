import {
  AdminArchiveView,
  AdminAssessmentView,
  AdminCommunicationsView,
  AdminCompletionRequirementsView,
  AdminFinalExamView,
  AdminPeopleView,
  AdminPermissionsView,
  AdminResultsView,
  AdminSatisfactionView,
  AdminSettingsView,
  AdminTasksView,
  AdminTrainingMaterialsView,
} from './dashboardViews';

const workspaceComponents = {
  archive: AdminArchiveView,
  courses: AdminAssessmentView,
  finalexam: AdminFinalExamView,
  completion: AdminCompletionRequirementsView,
  materials: AdminTrainingMaterialsView,
  notifications: AdminCommunicationsView,
  permissions: AdminPermissionsView,
  results: AdminResultsView,
  satisfaction: AdminSatisfactionView,
  settings: AdminSettingsView,
  tasks: AdminTasksView,
  users: AdminPeopleView,
};

export default {
  currentWorkspaceComponent() {
    return workspaceComponents[this.activeMenu] || null;
  },
  routeWorkspacePanel() {
    return this.normalizeDashboardPanel(this.$route.query.panel) || this.dashboardMenu[0]?.id || 'overview';
  },
  routeWorkspaceAssessmentType() {
    return this.normalizeDashboardAssessmentType(this.$route.query.assessmentType);
  },
  routeWorkspaceCourseId() {
    return typeof this.$route.query.courseId === 'string' ? this.$route.query.courseId.trim() : '';
  },
  routeSettingsItemId() {
    return typeof this.$route.query.settingsItem === 'string' ? this.$route.query.settingsItem.trim() : '';
  },
  currentWorkspaceProps() {
    const simpleEmbeddedPanels = ['tasks', 'materials', 'finalexam', 'users', 'permissions', 'satisfaction', 'archive'];

    if (this.activeMenu === 'results') return { embedded: true, panelMode: 'results' };
    if (this.activeMenu === 'courses') {
      return {
        embedded: true,
        clockTimestamp: this.currentTimestamp,
        assessmentTypeOverride: this.routeWorkspaceAssessmentType,
        courseIdOverride: this.routeWorkspaceCourseId,
      };
    }
    if (this.activeMenu === 'notifications') {
      return { embedded: true };
    }
    if (this.activeMenu === 'settings') {
      return {
        embedded: true,
        items: this.settingsItems,
        activeItemId: this.selectedSettingsItemId,
        hideSidebar: true,
      };
    }
    if (simpleEmbeddedPanels.includes(this.activeMenu)) {
      return {
        embedded: true,
        ...(this.activeMenu === 'tasks' ? { clockTimestamp: this.currentTimestamp } : {}),
      };
    }

    return {};
  },
  isAssessmentWorkspace() {
    return ['courses', 'tasks', 'finalexam', 'satisfaction'].includes(this.activeMenu);
  },
  isCommunicationsWorkspace() {
    return ['notifications', 'materials'].includes(this.activeMenu);
  },
  isRegistrationWorkspace() {
    return this.activeMenu === 'settings' && this.selectedSettingsItemId === 'registration';
  },
  finalExamCountdownItems() {
    if (this.activeMenu !== 'finalexam') return [];

    return this.buildTopbarCountdownItems(
      this.finalExamTopbarState.timers,
      'متبقي على الإغلاق:',
      this.finalExamTopbarState.branchLabel,
      this.finalExamTopbarState.closesAt,
    );
  },
  showFinalExamCountdown() {
    return this.finalExamCountdownItems.length > 0;
  },
  assessmentCountdownItems() {
    if (!['courses', 'tasks'].includes(this.activeMenu)) return [];

    return this.buildTopbarCountdownItems(
      this.assessmentTopbarState.timers,
      'متبقي على الإغلاق:',
      '',
      this.assessmentTopbarState.closesAt,
    );
  },
  showAssessmentCountdown() {
    return this.assessmentCountdownItems.length > 0;
  },
  showTopbarCountdown() {
    return this.showAssessmentCountdown || this.showFinalExamCountdown;
  },
  topbarCountdownItems() {
    return this.activeMenu === 'finalexam'
      ? this.finalExamCountdownItems
      : this.assessmentCountdownItems;
  },
  showAssessmentTopbarAction() {
    return ['courses', 'tasks'].includes(this.activeMenu) && this.assessmentTopbarState.visible;
  },
};
