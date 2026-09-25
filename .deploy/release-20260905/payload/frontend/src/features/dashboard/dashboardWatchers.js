

export default {
    managedBranchId: {
      immediate: true,
      handler(value) {
        if (value) {
          this.selectedOverviewBranch = value;
        }
      },
    },
    selectedTemplateCourse(course) {
      const templates = course?.assessmentNotificationTemplates || {};

      this.templateDraft = {
        pre: templates.pre || '',
        post: templates.post || '',
        tasks: templates.tasks || '',
      };
    },
    dashboardSnapshot: {
      immediate: true,
      handler() {
        this.ensureSatisfactionCourseSelection();
      },
    },
    dashboardIndicatorsSignature: {
      immediate: true,
      handler() {
        if (this.activeMenu !== 'overview') {
          return;
        }

        this.$nextTick(() => {
          this.restartIndicatorAnimation();
        });
      },
    },
    '$route.fullPath'() {
      this.syncDashboardStateFromRoute();
    },
    mobileMenuOpen(isOpen) {
      this.updateBodyScrollLock(isOpen);
    },
    activeMenu(menu) {
      if (menu === 'settings') {
        this.settingsMenuOpen = true;

        if (!this.selectedSettingsItemId || !this.settingsItems.some((item) => item.id === this.selectedSettingsItemId)) {
          this.selectedSettingsItemId = this.settingsItems[0]?.id || '';
        }
      }

      if (menu !== 'finalexam') {
        this.finalExamTopbarState = {
          branchCode: 'male',
          branchLabel: 'معلمين',
          isEnabled: false,
          closesAt: null,
          timers: [],
        };
      }

      if (!['courses', 'tasks'].includes(menu)) {
        this.assessmentTopbarState = {
          visible: false,
          label: '',
          type: '',
          isEnabled: false,
          closesAt: null,
          timers: [],
        };
      }

      if (!this.dashboardMenu.some((item) => item.id === menu)) {
        this.activeMenu = this.dashboardMenu[0]?.id || 'overview';
        return;
      }

      if (menu === 'overview') {
        this.$nextTick(() => {
          this.restartIndicatorAnimation();
        });
      }

      this.syncDashboardRouteQuery(menu);
    },
    selectedSettingsItemId() {
      if (this.activeMenu === 'settings') {
        this.syncDashboardRouteQuery('settings');
      }
    },
};
