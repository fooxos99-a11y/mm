export default {
  isAdmin() {
    return this.currentUser?.role === 'admin';
  },
  managerPermissions() {
    return this.dashboardSnapshot?.rolePermissions?.[this.currentUser?.role] || {};
  },
  showDashboardLoader() {
    return this.panelLoading || (this.dashboardLoading && !this.dashboardSnapshot);
  },
  overviewDialogLoading() {
    return this.templatesSubmitting || this.accountsPanelBusy;
  },
  adminName() {
    return this.currentUser?.name || this.currentUser?.loginCode || 'مدير النظام';
  },
  managedBranchId() {
    if (this.currentUser?.role === 'male_manager') return 'male';
    if (this.currentUser?.role === 'female_manager') return 'female';
    return '';
  },
  showOverviewBranchFilter() {
    return !this.managedBranchId;
  },
  effectiveOverviewBranch() {
    return this.managedBranchId || this.selectedOverviewBranch;
  },
  dashboardMenu() {
    return [
      { id: 'overview', label: 'الرئيسية', icon: 'mdi-home-outline', mode: 'panel' },
      { id: 'courses', label: 'الدورات', icon: 'mdi-database-outline', mode: 'panel' },
      { id: 'tasks', label: 'المهام الأدائية', icon: 'mdi-clipboard-text-outline', mode: 'panel' },
      { id: 'finalexam', label: 'الاختبار النهائي', icon: 'mdi-school-outline', mode: 'panel' },
      { id: 'satisfaction', label: 'استبيان الرضا', icon: 'mdi-clipboard-text-clock-outline', mode: 'panel' },
      { id: 'users', label: 'المستخدمين', icon: 'mdi-account-group-outline', mode: 'panel' },
      { id: 'notifications', label: 'الإشعارات', icon: 'mdi-bell-outline', mode: 'panel' },
      { id: 'materials', label: 'المواد التدريبية', icon: 'mdi-folder-multiple-outline', mode: 'panel' },
      { id: 'results', label: 'النتائج', icon: 'mdi-chart-box-outline', mode: 'panel' },
      { id: 'completion', label: 'متطلبات الاجتياز', icon: 'mdi-certificate-outline', mode: 'panel' },
      { id: 'settings', label: 'الاعدادات', icon: 'mdi-cog-outline', mode: 'panel', dividerBefore: true },
    ].filter((item) => this.canAccessPanel(item.id));
  },
  settingsItems() {
    const items = [];

    if (this.isAdmin) {
      items.push({ id: 'home', label: 'صفحة رخصة ممارس', icon: 'mdi-page-layout-body', kind: 'panel' });
    }
    if (this.canAccessPanel('permissions')) {
      items.push({
        id: 'permissions',
        label: this.isAdmin ? 'الإشراف والصلاحيات' : 'الصلاحيات',
        icon: 'mdi-shield-account-outline',
        kind: 'panel',
      });
    }
    if (this.canAccessPanel('archive')) {
      items.push({ id: 'archive', label: 'الأرشيف', icon: 'mdi-archive-outline', kind: 'panel' });
    }
    if (this.canAccessPanel('registration')) {
      items.push({ id: 'registration', label: 'التسجيل', icon: 'mdi-account-plus-outline', kind: 'panel' });
    }
    if (this.isAdmin) {
      items.push({ id: 'templates', label: 'القوالب', icon: 'mdi-file-document-edit-outline', kind: 'panel' });
    }

    return items;
  },
  adminLinks() {
    return [
      { name: 'courses', title: 'الدورات', icon: 'mdi-view-dashboard-outline', panel: 'courses' },
      { name: 'tasks', title: 'إدارة المهام', icon: 'mdi-clipboard-list-outline', panel: 'tasks' },
      { name: 'final', title: 'إدارة النهائي', icon: 'mdi-trophy-outline', panel: 'finalexam' },
      { name: 'people', title: 'المعلمون والمقرئون', icon: 'mdi-account-group-outline', panel: 'users' },
      { name: 'communications', title: 'الإشعارات', icon: 'mdi-bell-outline', panel: 'notifications' },
      { name: 'results', title: 'النتائج والحضور', icon: 'mdi-chart-box-outline', panel: 'results' },
    ].filter((item) => this.canAccessPanel(item.panel));
  },
  overviewTopActions() {
    return [];
  },
  courseDialogOptions() {
    return (this.dashboardSnapshot?.courses || []).map((course) => ({
      label: course.title,
      value: course.id,
    }));
  },
  selectedTemplateCourse() {
    return (this.dashboardSnapshot?.courses || []).find((course) => course.id === this.selectedTemplateCourseId) || null;
  },
  directAccessLinks() {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    return [
      { id: 'pre', title: 'رابط الاختبارات القبلية', url: `${origin}/course/pre` },
      { id: 'post', title: 'رابط الاختبارات البعدية', url: `${origin}/course/post` },
      { id: 'tasks', title: 'رابط المهام الأدائية', url: `${origin}/course/tasks` },
      { id: 'final-exam', title: 'رابط الاختبار النهائي', url: `${origin}/final-exam` },
    ];
  },
};
