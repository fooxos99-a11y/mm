

export default {
    async initializeDashboard() {
      this.panelLoading = true;

      try {
        if (await this.ensureDashboardSnapshot({ mode: 'shell' })) {
          await this.syncDashboardStateFromRoute();
        }
      } finally {
        this.panelLoading = false;
      }
    },
    normalizeDashboardPanel(panel) {
      const value = typeof panel === 'string' ? panel.trim().toLowerCase() : '';

      return this.dashboardMenu.some((item) => item.id === value) ? value : '';
    },
    normalizeDashboardAssessmentType(type) {
      return ['pre', 'post'].includes(type) ? type : 'pre';
    },
    hasSameRouteQuery(nextQuery) {
      const currentQuery = this.$route.query || {};
      const currentKeys = Object.keys(currentQuery).sort((left, right) => left.localeCompare(right));
      const nextKeys = Object.keys(nextQuery).sort((left, right) => left.localeCompare(right));

      if (currentKeys.length !== nextKeys.length) {
        return false;
      }

      return currentKeys.every((key, index) => key === nextKeys[index] && String(currentQuery[key]) === String(nextQuery[key]));
    },
    async syncDashboardStateFromRoute() {
      if (this.$route.name !== 'dashboard') {
        return;
      }

      const routePanel = this.routeWorkspacePanel;

      const mode = ['overview', 'users', 'results'].includes(routePanel) ? 'shell' : 'full';
      const needsLoad = !this.dashboardSnapshot || this.dashboardError
        || (mode === 'full' && this.dashboardSnapshot.snapshotMode === 'shell');
      if (needsLoad) this.panelLoading = true;
      try {
        const ready = needsLoad ? await this.ensureDashboardSnapshot({ mode }) : true;
        if (!ready || this.routeWorkspacePanel !== routePanel) return;

        if (routePanel && this.activeMenu !== routePanel) {
          this.activeMenu = routePanel;
        }

        if (routePanel === 'settings' && this.routeSettingsItemId && this.settingsItems.some((item) => item.id === this.routeSettingsItemId)) {
          this.selectedSettingsItemId = this.routeSettingsItemId;
          this.settingsMenuOpen = true;
        }
      } finally {
        if (needsLoad) this.panelLoading = false;
      }
    },
    syncDashboardRouteQuery(panel = this.activeMenu) {
      if (this.$route.name !== 'dashboard') {
        return;
      }

      const nextQuery = {};

      if (panel && panel !== 'overview') {
        nextQuery.panel = panel;
      }

      if (panel === 'courses' && this.routeWorkspaceAssessmentType === 'post') {
        nextQuery.assessmentType = 'post';
      }

      if (panel === 'courses' && this.routeWorkspaceCourseId) {
        nextQuery.courseId = this.routeWorkspaceCourseId;
      }

      if (panel === 'settings' && this.selectedSettingsItemId) {
        nextQuery.settingsItem = this.selectedSettingsItemId;
      }

      if (this.hasSameRouteQuery(nextQuery)) {
        return;
      }

      this.$router.replace({
        name: 'dashboard',
        query: nextQuery,
      }).catch(() => {});
    },
    async openPanel(panel) {
      if (this.panelLoading) {
        return;
      }

      const currentPanel = this.$refs?.workspacePanel;
      if (['courses', 'tasks'].includes(this.activeMenu)
        && panel !== this.activeMenu
        && currentPanel?.confirmDiscardChanges
        && !currentPanel.confirmDiscardChanges()) {
        return;
      }

      if (!['courses', 'tasks'].includes(panel)) {
        this.assessmentTopbarState = {
          visible: false,
          label: '',
          type: '',
          isEnabled: false,
          closesAt: null,
          timers: [],
        };
      }

      this.mobileMenuOpen = false;

      if (this.activeMenu === panel && this.dashboardSnapshot && !this.dashboardError) {
        return;
      }

      this.panelLoading = true;

      try {
        if (await this.ensureDashboardSnapshot({ mode: ['overview', 'users', 'results'].includes(panel) ? 'shell' : 'full' })) {
          this.activeMenu = panel;
        }
      } finally {
        this.panelLoading = false;
      }
    },
    scrollToSection(targetId) {
      this.$nextTick(() => {
        const target = document.getElementById(targetId);

        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    },
    async copyDirectAccessLink(item) {
      if (!item?.url) {
        return;
      }

      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(item.url);
        }

        this.$toast.success('تم نسخ الرابط');
      } catch (error) {
        this.$toast.error(error?.message || 'تعذر نسخ الرابط');
      }
    },
    async handleOverviewAction(action) {
      if (this.panelLoading || this.overviewDialogLoading) {
        return;
      }

      if (action.id === 'links') {
        this.openLinksDialog();
        return;
      }

      if (action.id === 'supervision') {
        await this.openAdminsDialog();
        return;
      }

      if (action.id === 'templates') {
        this.openTemplatesDialog();
      }
    },
    async handleMenu(item) {
      if (item.id === 'settings') {
        this.settingsMenuOpen = !this.settingsMenuOpen;

        if (this.settingsMenuOpen) {
          this.assessmentTopbarState = {
            visible: false,
            label: '',
            type: '',
            isEnabled: false,
            closesAt: null,
            timers: [],
          };
        }

        return;
      }

      this.mobileMenuOpen = false;
      this.settingsMenuOpen = false;

      if (item.mode === 'page' && item.target) {
        this.$router.push({ name: item.target });
        return;
      }

      if (item.mode === 'panel') {
        await this.openPanel(item.id);
        return;
      }

      this.activeMenu = 'overview';
      this.scrollToSection(item.target);
    },
};
