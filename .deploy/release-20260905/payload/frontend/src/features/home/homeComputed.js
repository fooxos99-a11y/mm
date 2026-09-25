import { resolveUserHomeLabel, resolveUserHomeRoute } from '../../utils/authRoutes';
import { normalizeHomePageContent } from '../../utils/homePageContent';
import { LICENSE_PROGRAM_META, PROGRAM_CONTENT_INDEX_BY_KEY } from './homeProgramMeta';

export default {
    currentYear() {
      return new Date().getFullYear();
    },
    homePageContent() {
      return normalizeHomePageContent(this.publicSnapshot?.homePageContent || null);
    },
    licensePrograms() {
      const orderedPrograms = [
        ...LICENSE_PROGRAM_META.filter((program) => program.key === 'practitioner'),
        ...LICENSE_PROGRAM_META.filter((program) => program.key !== 'practitioner'),
      ];

      return orderedPrograms.map((program) => {
        const content = this.homePageContent.programs[PROGRAM_CONTENT_INDEX_BY_KEY[program.key]] || {};
        const stats = this.licenseProgramStats(program.key);

        return {
          ...program,
          title: content.title || '',
          menuSubtitle: content.menuSubtitle || '',
          description: content.description || '',
          audience: content.audience || '',
          features: Array.isArray(content.features) ? content.features : [],
          stats,
        };
      });
    },
    graduateDetailStats() {
      const details = this.publicStats?.graduateDetails || {};

      return [
        { key: 'manager', label: 'عدد خريجين رخصة مدير', value: details.manager || 0 },
        { key: 'supervisor', label: 'عدد خريجين رخصة مشرف', value: details.supervisor || 0 },
        { key: 'secretary', label: 'عدد خريجين رخصة سكرتير', value: details.secretary || 0 },
        { key: 'practitioner', label: 'عدد خريجين رخصة ممارس', value: details.practitioner || 0 },
      ];
    },
    faqItems() {
      return this.homePageContent.faqItems;
    },
    publicStudents() {
      return this.publicSnapshot?.students || [];
    },
    publicSatisfactionResponses() {
      return this.publicSnapshot?.satisfactionResponses || [];
    },
    licenseStatsDetails() {
      return this.publicStats?.licenseDetails || {};
    },
    maleTraineesCount() {
      return this.publicStudents.filter((student) => student.branchId === 'male').length;
    },
    femaleTraineesCount() {
      return this.publicStudents.filter((student) => student.branchId === 'female').length;
    },
    satisfactionRatePercent() {
      const ratingValues = this.publicSatisfactionResponses
        .map((item) => Number(item.ratingValue))
        .filter((value) => Number.isFinite(value));

      if (!ratingValues.length) {
        return 0;
      }

      const average = ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length;
      return Math.round(average * 10);
    },
    achievementStats() {
      return [
        {
          key: 'maleTrainees',
          title: this.homePageContent.achievements.maleTraineesTitle,
          icon: 'mdi-account-group-outline',
          value: this.maleTraineesCount,
          animatedValue: this.animatedAchievements.maleTrainees,
          format: 'number',
        },
        {
          key: 'femaleTrainees',
          title: this.homePageContent.achievements.femaleTraineesTitle,
          icon: 'mdi-account-multiple-outline',
          value: this.femaleTraineesCount,
          animatedValue: this.animatedAchievements.femaleTrainees,
          format: 'number',
        },
        {
          key: 'satisfactionRate',
          title: this.homePageContent.achievements.satisfactionRateTitle,
          icon: 'mdi-star-four-points-outline',
          value: this.satisfactionRatePercent,
          animatedValue: this.animatedAchievements.satisfactionRate,
          format: 'percent',
        },
        {
          key: 'licenseCount',
          title: this.homePageContent.achievements.licenseCountTitle,
          icon: 'mdi-certificate-outline',
          value: this.licensePrograms.length,
          animatedValue: this.animatedAchievements.licenseCount,
          format: 'number',
        },
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
    accountMenuItems() {
      if (this.currentUser?.role !== 'student') {
        return [
          { key: 'primary', label: this.primaryRouteLabel, action: 'route', route: this.primaryRoute },
          { key: 'logout', label: 'تسجيل الخروج', action: 'logout', danger: true },
        ];
      }
      return [
        { key: 'student', label: 'حسابي', action: 'route', route: { name: 'student' } },
        { key: 'logout', label: 'تسجيل الخروج', action: 'logout', danger: true },
      ];
    },
    primaryRoute() {
      return resolveUserHomeRoute(this.currentUser);
    },
    primaryRouteLabel() {
      return resolveUserHomeLabel(this.currentUser);
    },
};
