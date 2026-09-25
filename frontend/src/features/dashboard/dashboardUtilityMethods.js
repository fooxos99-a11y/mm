

export default {
    indicatorStyle(progress) {
      const normalized = Math.round(this.animatedIndicatorPercent(progress));
      const radius = 78;
      const circumference = 2 * Math.PI * radius;
      const filled = normalized === 100 ? circumference : (circumference * normalized) / 100;

      return {
        '--indicator-dasharray': `${filled} ${circumference}`,
      };
    },
    hasPermission(key) {
      if (this.isAdmin) {
        return true;
      }

      return this.managerPermissions?.[key] === true;
    },
    canAccessPanel(panelId) {
      if (this.isAdmin) {
        return true;
      }

      switch (panelId) {
        case 'overview':
          return this.hasPermission('page_overview');
        case 'attendance':
        case 'results':
          return this.hasPermission('page_results');
        case 'completion':
          return this.hasPermission('page_completion_requirements');
        case 'courses':
          return this.hasPermission('page_courses');
        case 'tasks':
          return this.hasPermission('page_tasks');
        case 'settings':
          return this.settingsItems.length > 0;
        case 'users':
          return this.hasPermission('page_users');
        case 'notifications':
          return this.hasPermission('page_notifications');
        case 'materials':
          return this.hasPermission('page_materials');
        case 'archive':
          return this.isAdmin && this.hasPermission('page_archive');
        case 'registration':
          return this.hasPermission('page_registration');
        case 'finalexam':
          return this.hasPermission('page_final_exam');
        case 'satisfaction':
          return this.hasPermission('page_satisfaction');
        case 'permissions':
        default:
          return false;
      }
    },
    canAccessOverviewAction(actionId) {
      if (this.isAdmin) {
        return true;
      }

      return actionId === 'links';
    },
    ensureDialogCourseSelection() {
      const [firstCourse] = this.courseDialogOptions;

      if (!this.selectedTemplateCourseId || !this.courseDialogOptions.some((option) => option.value === this.selectedTemplateCourseId)) {
        this.selectedTemplateCourseId = firstCourse?.value || '';
      }
    },
    openLinksDialog() {
      this.linksDialogOpen = true;
    },
    openAdminsDialog() {
      this.adminsDialogOpen = true;
    },
    async openTemplatesDialog() {
      if (!await this.ensureDashboardSnapshot()) return;
      this.ensureDialogCourseSelection();
      this.templatesDialogOpen = true;
    },
    async saveNotificationTemplates() {
      if (!this.selectedTemplateCourseId) {
        return;
      }

      this.templatesSubmitting = true;

      try {
        await this.updateCourse({
          courseId: this.selectedTemplateCourseId,
          updates: {
            assessmentNotificationTemplates: {
              pre: this.templateDraft.pre || '',
              post: this.templateDraft.post || '',
              tasks: this.templateDraft.tasks || '',
            },
          },
        });
        this.$toast.success('تم حفظ القوالب');
        this.templatesDialogOpen = false;
      } catch (error) {
        this.$toast.error(error?.response?.data?.message || 'تعذر حفظ القوالب');
      } finally {
        this.templatesSubmitting = false;
      }
    },
    resetAdminDialog() {
      this.adminsDialogOpen = false;
      this.accountsPanelBusy = false;
    },
    setAccountsPanelBusy(value) {
      this.accountsPanelBusy = value;
    },
};
