import { normalizePractitionerPageContent } from '../../utils/practitionerPageContent';
import { resolveUserHomeLabel, resolveUserHomeRoute } from '../../utils/authRoutes';
import { PRACTITIONER_NAV_LINKS, PRACTITIONER_PROGRAM_INDICATORS } from './practitionerMeta';

export default {
    currentYear() {
      return new Date().getFullYear();
    },
    pageContent() {
      return normalizePractitionerPageContent(this.publicSnapshot?.practitionerPageContent || this.dashboardSnapshot?.practitionerPageContent || null);
    },
    pageNavItems() {
      return this.pageContent.navItems.map((item, index) => ({
        href: PRACTITIONER_NAV_LINKS[index] || '#about',
        label: item.label,
      }));
    },
    pageGoals() {
      return this.pageContent.goals;
    },
    pageDomains() {
      return this.pageContent.domains.map((domain, index) => ({
        ...domain,
        icon: this.domains[index]?.icon || 'mdi-book-open-page-variant',
      }));
    },
    pageIncludesItems() {
      return this.pageContent.includesItems.map((item, index) => ({
        ...item,
        icon: this.includesItems[index]?.icon || 'mdi-check',
      }));
    },
    pageRequirements() {
      return this.pageContent.requirements.map((text, index) => ({
        text,
        icon: this.requirements[index]?.icon || 'mdi-check-circle-outline',
      }));
    },
    pageRecitation() {
      return this.pageContent.recitation.map((item, index) => ({
        ...item,
        icon: this.recitation[index]?.icon || 'mdi-book-open-page-variant-outline',
      }));
    },
    pageDurationQuickInfo() {
      return this.pageContent.durationQuickInfo.map((item, index) => ({
        ...item,
        icon: this.durationQuickInfo[index]?.icon || 'mdi-clock-outline',
      }));
    },
    pageStartDates() {
      return this.pageContent.startDates;
    },
    licenseShortcutItems() {
      return [
        { key: 'home', label: 'العودة للرئيسية', icon: 'mdi-home-outline', to: { name: 'home', hash: '#home' } },
        { key: 'licenses', label: 'الرخص المهنية', icon: 'mdi-view-grid-outline', to: { name: 'home', hash: '#programs' } },
        { key: 'practitioner', label: 'رخصة ممارس', icon: 'mdi-certificate-outline', to: { name: 'practitioner' } },
        { key: 'manager', label: 'رخصة مدير', icon: 'mdi-lock-outline', disabled: true },
        { key: 'supervisor', label: 'رخصة مشرف', icon: 'mdi-lock-outline', disabled: true },
        { key: 'secretary', label: 'رخصة سكرتير', icon: 'mdi-lock-outline', disabled: true },
        ...this.pageNavItems.map((item) => ({
          key: item.href,
          label: item.label,
          icon: 'mdi-arrow-top-left',
          href: item.href,
        })),
      ];
    },
    profileName() {
      return this.currentUser?.name || this.currentUser?.full_name || 'الحساب';
    },
    accountRoleLabel() {
      const labels = {
        admin: 'مدير النمو المهني',
        male_manager: 'مشرف',
        female_manager: 'مشرفة',
        reciter: 'مقرئ',
        student: 'طالب',
        trainee: 'معلم',
      };

      return labels[this.currentUser?.role] || 'مستخدم';
    },
    currentStudentRecord() {
      if (this.currentUser?.role !== 'student') {
        return null;
      }

      const loginCode = String(this.currentUser?.loginCode || '').trim();
      return (this.dashboardSnapshot?.students || []).find((student) => student.loginId === loginCode) || null;
    },
    currentStudentBranchId() {
      return this.currentStudentRecord?.branchId || '';
    },
    currentStudentCourse() {
      return ((this.dashboardSnapshot?.courses || []).filter((course) => course.entityType !== 'task')).find((course) => course.isActive) || null;
    },
    studentOpenTask() {
      return ((this.dashboardSnapshot?.courses || [])
        .filter((course) => course.entityType === 'task')
        .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0)))
        .find((task) => this.isStudentTaskEnabled(task)) || null;
    },
    isStudentPreEnabled() {
      return this.isStudentAssessmentEnabled('pre');
    },
    isStudentPostEnabled() {
      return this.isStudentAssessmentEnabled('post');
    },
    isStudentTasksEnabled() {
      return Boolean(this.studentOpenTask);
    },
    isStudentFinalExamEnabled() {
      if (!this.currentStudentBranchId) {
        return false;
      }

      const branchSetting = this.dashboardSnapshot?.finalExamSettings?.[this.currentStudentBranchId] || { isEnabled: false, closesAt: null };

      if (!branchSetting.isEnabled || !branchSetting.closesAt) {
        return false;
      }

      const closesAt = new Date(branchSetting.closesAt).getTime();
      return Number.isFinite(closesAt) && closesAt > this.currentTimestamp;
    },
    accountMenuItems() {
      if (this.currentUser?.role !== 'student') {
        return [
          { key: 'primary', label: this.primaryRouteLabel, action: 'route', route: this.primaryRoute },
          { key: 'logout', label: 'تسجيل الخروج', action: 'logout', danger: true },
        ];
      }

      return [
        { key: 'student', label: 'حسابي', action: 'route', route: { name: 'student' } },
        ...(this.isStudentPreEnabled
          ? [{ key: 'pre', label: 'الاختبار القبلي', action: 'route', route: { name: 'courses', params: { assessmentType: 'pre' } } }]
          : []),
        ...(this.isStudentPostEnabled
          ? [{ key: 'post', label: 'الاختبار البعدي', action: 'route', route: { name: 'courses', params: { assessmentType: 'post' } } }]
          : []),
        ...(this.isStudentTasksEnabled
          ? [{ key: 'tasks', label: 'المهمة الأدائية', action: 'route', route: this.studentOpenTask ? { name: 'tasks', query: { taskId: this.studentOpenTask.id } } : { name: 'tasks' } }]
          : []),
        ...(this.isStudentFinalExamEnabled
          ? [{ key: 'final-exam', label: 'الاختبار النهائي', action: 'route', route: { name: 'final-exam' } }]
          : []),
        { key: 'logout', label: 'تسجيل الخروج', action: 'logout', danger: true },
      ];
    },
    primaryRoute() {
      return resolveUserHomeRoute(this.currentUser);
    },
    primaryRouteLabel() {
      return resolveUserHomeLabel(this.currentUser);
    },
    programIndicators() {
      return PRACTITIONER_PROGRAM_INDICATORS.map((indicator) => ({
        ...indicator,
        label: this.pageContent.indicatorLabels[indicator.key] || indicator.label,
      }));
    },
    siteStats() {
      const s = this.publicStats;
      return [
        {
          key: 'graduates',
          value: s ? s.graduates : null,
          suffix: '+',
          label: 'المتخرجين',
        },
        {
          key: 'satisfaction',
          value: s ? s.satisfactionRate : null,
          suffix: '%',
          label: 'نسبة الرضا',
        },
        {
          key: 'courses',
          value: s ? s.courses : null,
          suffix: '+',
          label: 'عدد الدورات',
        },
      ];
    },
};
