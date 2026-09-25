import { fetchPublicSnapshot, fetchPublicStats } from '../../services/publicApi';
import { fetchPublicRegistrationStatus } from '../../services/registrationApi';
import { DISPLAY_NUMBER_PATTERN, easeOutCubic } from './practitionerMeta';

export default {
    async loadPublicData() {
      try {
        const [snapshot, stats] = await Promise.all([
          fetchPublicSnapshot(),
          fetchPublicStats(),
        ]);

        this.publicSnapshot = snapshot;
        this.publicStats = stats;
      } catch {
        this.publicSnapshot = null;
        this.publicStats = null;
      }
    },
    async loadRegistrationStatus() {
      try {
        const payload = await fetchPublicRegistrationStatus();
        this.isRegistrationOpen = Boolean(payload?.isOpen);
      } catch (error) {
        this.isRegistrationOpen = false;
      }
    },
    async refreshAvailabilitySilently() {
      try {
        if (this.isAuthenticated) {
          await this.loadDashboardSnapshot();
          return;
        }

        await this.loadPublicData();
      } catch {
        // Keep the last known state when background polling fails.
      }
    },
    getWindowMeta(value) {
      if (!value) {
        return { opensAt: '', closesAt: '' };
      }

      if (typeof value === 'string') {
        return { opensAt: '', closesAt: value };
      }

      return {
        opensAt: value.opensAt || '',
        closesAt: value.closesAt || '',
      };
    },
    isWindowActive(value) {
      const windowMeta = this.getWindowMeta(value);

      if (!windowMeta.closesAt) {
        return false;
      }

      const closesAt = new Date(windowMeta.closesAt).getTime();

      if (!Number.isFinite(closesAt) || closesAt <= this.currentTimestamp) {
        return false;
      }

      if (!windowMeta.opensAt) {
        return true;
      }

      const opensAt = new Date(windowMeta.opensAt).getTime();
      return !Number.isFinite(opensAt) || opensAt <= this.currentTimestamp;
    },
    isStudentAssessmentEnabled(type) {
      if (!this.currentStudentCourse || !this.currentStudentBranchId) {
        return false;
      }

      const branchAvailability = this.currentStudentCourse.branchAvailability?.[this.currentStudentBranchId] || {};
      const enabledBySettings = type === 'pre'
        ? Boolean(this.currentStudentCourse.isPreEnabled && branchAvailability.pre !== false)
        : Boolean(this.currentStudentCourse.isPostEnabled && branchAvailability.post !== false);

      if (!enabledBySettings) {
        return false;
      }

      const branchWindow = this.getWindowMeta(this.currentStudentCourse.assessmentWindows?.[this.currentStudentBranchId]?.[type]);
      const globalWindow = this.getWindowMeta(this.currentStudentCourse.assessmentWindows?.global?.[type]);
      const hasWindowConfig = Boolean(branchWindow.closesAt || globalWindow.closesAt);

      if (!hasWindowConfig) {
        return true;
      }

      return this.isWindowActive(branchWindow) || this.isWindowActive(globalWindow);
    },
    isStudentTaskEnabled(task) {
      if (!task || !this.currentStudentBranchId) {
        return false;
      }

      const branchAvailability = task.branchAvailability?.[this.currentStudentBranchId] || {};

      if (!(task.isTasksEnabled && branchAvailability.tasks !== false)) {
        return false;
      }

      const branchWindow = this.getWindowMeta(task.assessmentWindows?.[this.currentStudentBranchId]?.tasks);
      const globalWindow = this.getWindowMeta(task.assessmentWindows?.global?.tasks);
      const hasWindowConfig = Boolean(branchWindow.closesAt || globalWindow.closesAt);

      if (!hasWindowConfig) {
        return true;
      }

      return this.isWindowActive(branchWindow) || this.isWindowActive(globalWindow);
    },
    openProgram(program) {
      if (!program?.available || !program.route) {
        return;
      }

      this.$router.push(program.route).catch(() => {});
    },
    maybeStartStatsAnimation() {
      if (this.statsAnimationStarted || !this.statsSectionVisible) {
        return;
      }

      this.statsAnimationStarted = true;
      this.startStatsAnimation();
    },
    startStatsAnimation(duration = 3600) {
      if (this.statsAnimationFrameId && typeof window !== 'undefined') {
        window.cancelAnimationFrame(this.statsAnimationFrameId);
      }

      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        this.statsAnimationProgress = 1;
        return;
      }

      const start = window.performance?.now?.() ?? Date.now();
      this.statsAnimationProgress = 0;

      const tick = (timestamp) => {
        const progress = Math.min(1, ((timestamp ?? Date.now()) - start) / duration);
        this.statsAnimationProgress = easeOutCubic(progress);
        this.statsAnimationFrameId = progress < 1 ? window.requestAnimationFrame(tick) : null;
      };

      this.statsAnimationFrameId = window.requestAnimationFrame(tick);
    },
    animatedProgramStatValue(display) {
      const text = String(display ?? '');
      const match = text.match(DISPLAY_NUMBER_PATTERN);

      if (!match) {
        return text;
      }

      const [, prefix, rawValue, suffix] = match;
      const targetValue = Number(rawValue);

      if (!Number.isFinite(targetValue)) {
        return text;
      }

      const decimals = (rawValue.split('.')[1] || '').length;
      const animatedValue = targetValue * this.statsAnimationProgress;
      const roundedValue = decimals > 0
        ? animatedValue.toFixed(decimals)
        : Math.round(animatedValue);
      const formattedValue = new Intl.NumberFormat('ar-SA').format(Number(roundedValue));

      return `${prefix}${formattedValue}${suffix}`;
    },
    handleScroll() {
      this.scrolled = window.scrollY > 20;

      if (!this.statsAnimationStarted) {
        const section = this.$el?.querySelector?.('.stats-section');

        if (section) {
          const bounds = section.getBoundingClientRect();
          const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
          this.statsSectionVisible = bounds.top <= viewportHeight * 0.78 && bounds.bottom >= viewportHeight * 0.22;
          this.maybeStartStatsAnimation();
        }
      }
    },
    handleWindowClick() {
      this.accountMenuOpen = false;
    },
    handleResize() {
    },
    handleAccountClick() {
      if (this.isAuthenticated) {
        this.accountMenuOpen = !this.accountMenuOpen;
        return;
      }

      this.openLoginDialog(this.$route.query.redirect || '');
    },
    openProfileDialog() {
      this.accountMenuOpen = false;
      this.profileDialogOpen = true;
    },
    handleAccountMenuAction(item) {
      if (!item || item.disabled) {
        return;
      }

      if (item.action === 'profile') {
        this.openProfileDialog();
        return;
      }

      if (item.action === 'logout') {
        this.submitLogout();
        return;
      }

      if (item.action === 'route' && item.route) {
        this.accountMenuOpen = false;
        this.profileDialogOpen = false;
        this.$router.push(item.route).catch(() => {});
      }
    },
    closeProfileDialog() {
      this.profileDialogOpen = false;
    },
    goToDashboard() {
      this.accountMenuOpen = false;
      this.profileDialogOpen = false;
      this.$router.push(this.primaryRoute).catch(() => {});
    },
    async submitLogout() {
      this.accountMenuOpen = false;
      this.profileDialogOpen = false;
      await this.logout();
      this.$router.replace({ name: 'practitioner' }).catch(() => {});
    },
    openLoginDialog(redirectPath = '') {
      this.loginRedirectPath = redirectPath || this.$route.query.redirect || '';
      this.loginDialogOpen = true;

      const query = {
        ...this.$route.query,
        login: '1',
      };

      if (this.loginRedirectPath) {
        query.redirect = this.loginRedirectPath;
      }

      this.$router.replace({ name: 'practitioner', query, hash: this.$route.hash }).catch(() => {});
    },
    closeLoginDialog() {
      this.loginDialogOpen = false;

      const query = { ...this.$route.query };
      delete query.login;
      delete query.redirect;

      this.$router.replace({ name: 'practitioner', query, hash: this.$route.hash }).catch(() => {});
    },
    syncLoginDialogFromRoute() {
      if (this.isAuthenticated) {
        this.loginDialogOpen = false;
        this.accountMenuOpen = false;
        return;
      }

      if (this.$route.query.login === '1') {
        this.loginDialogOpen = true;
        this.loginRedirectPath = this.$route.query.redirect || '';
      } else {
        this.loginDialogOpen = false;
      }
    },
    async submitLoginDialog() {
      if (!this.loginForm.loginCode || !this.loginForm.password) {
        return;
      }

      try {
        await this.login(this.loginForm);
        const redirectTarget = this.loginRedirectPath || { name: 'practitioner' };
        this.accountMenuOpen = false;
        this.closeLoginDialog();
        this.$router.replace(redirectTarget).catch(() => {});
      } catch {
        // Error text is already handled by the store.
      }
    },
};
