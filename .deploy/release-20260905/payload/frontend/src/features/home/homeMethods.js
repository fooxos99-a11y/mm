import { resolveUserHomeRoute } from '../../utils/authRoutes';

const loadPublicApi = () => import(
  /* webpackChunkName: "public-api" */
  '../../services/publicApi'
);

export default {
    schedulePublicDataLoad() {
      this.publicDataTimerId = window.setTimeout(() => {
        this.publicDataTimerId = null;
        this.loadPublicData();
        this.loadPublicStats();
      }, 500);
    },
    scheduleDeferredContent() {
      const mountSupportingContent = () => {
        this.supportingContentMounted = true;
        this.deferredContentObserver?.disconnect();
        this.deferredContentObserver = null;
        this.deferredContentTimerId = null;
      };
      const observeSupportingContent = () => {
        const trigger = this.$refs.supportingContentTrigger;

        if ('IntersectionObserver' in window && trigger) {
          this.deferredContentObserver = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
              mountSupportingContent();
            }
          }, { rootMargin: '240px 0px' });
          this.deferredContentObserver.observe(trigger);
          return;
        }

        this.deferredContentTimerId = window.setTimeout(mountSupportingContent, 500);
      };
      const mountPrograms = () => {
        this.programsMounted = true;
        this.deferredProgramsObserver?.disconnect();
        this.deferredProgramsObserver = null;
        this.$nextTick(observeSupportingContent);
      };
      const observePrograms = () => {
        const trigger = this.$refs.programsTrigger;

        if ('IntersectionObserver' in window && trigger) {
          this.deferredProgramsObserver = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) mountPrograms();
          }, { rootMargin: '320px 0px' });
          this.deferredProgramsObserver.observe(trigger);
          return;
        }

        this.deferredContentTimerId = window.setTimeout(mountPrograms, 800);
      };
      const firstFrame = window.requestAnimationFrame(() => {
        const secondFrame = window.requestAnimationFrame(observePrograms);
        this.deferredContentFrameIds.push(secondFrame);
      });

      this.deferredContentFrameIds.push(firstFrame);
    },
    async loadPublicData() {
      try {
        const { fetchPublicSnapshot } = await loadPublicApi();
        this.publicSnapshot = await fetchPublicSnapshot();
      } catch {
        this.publicSnapshot = null;
      } finally {
        this.publicDataLoaded = true;
        this.maybeStartAchievementAnimation();
      }
    },
    async loadPublicStats() {
      try {
        const { fetchPublicStats } = await loadPublicApi();
        this.publicStats = await fetchPublicStats();
        this.$nextTick(() => this.maybeStartStatsAnimation());
      } catch {
        this.publicStats = null;
      }
    },
    maybeStartStatsAnimation() {
      if (this.statsAnimationStarted || !this.publicStats || !this.achievementSectionVisible) {
        return;
      }

      this.statsAnimationStarted = true;
      this.startStatsAnimation();
    },
    startStatsAnimation(duration = 3600) {
      if (this.statsAnimationFrameId) window.cancelAnimationFrame(this.statsAnimationFrameId);
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { this.statsAnimationProgress = 1; return; }
      const start = window.performance?.now?.() ?? Date.now();
      this.statsAnimationProgress = 0;
      const easeOut = (t) => 1 - ((1 - t) ** 3);
      const tick = (ts) => {
        const p = Math.min(1, ((ts ?? Date.now()) - start) / duration);
        this.statsAnimationProgress = easeOut(p);
        this.statsAnimationFrameId = p < 1 ? window.requestAnimationFrame(tick) : null;
      };
      this.statsAnimationFrameId = window.requestAnimationFrame(tick);
    },
    animatedStatValue(value) {
      if (value === null || value === undefined) return '0';
      return new Intl.NumberFormat('ar-SA').format(Math.round(Number(value) * this.statsAnimationProgress));
    },
    licenseProgramStats(key) {
      const details = this.licenseStatsDetails[key];

      if (!details) {
        return [];
      }

      return [
        { key: 'graduates', label: 'المستفيدين', value: details.graduates || 0 },
        { key: 'batches', label: 'الدفعات', value: details.batches || 0 },
        { key: 'courses', label: 'الدورات', value: details.courses || 0 },
      ];
    },
    maybeStartAchievementAnimation() {
      if (this.achievementAnimationStarted || !this.achievementSectionVisible || !this.publicDataLoaded) {
        return;
      }

      this.achievementAnimationStarted = true;
      this.animateAchievementStats();
    },
    animateAchievementStats() {
      const targets = {
        maleTrainees: this.maleTraineesCount,
        femaleTrainees: this.femaleTraineesCount,
        satisfactionRate: this.satisfactionRatePercent,
        licenseCount: this.licensePrograms.length,
      };

      const startValues = { ...this.animatedAchievements };
      const duration = 2800;
      const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

      if (this.achievementAnimationTimer && typeof window !== 'undefined') {
        window.clearTimeout(this.achievementAnimationTimer);
      }

      const step = (timestamp) => {
        const now = typeof timestamp === 'number' ? timestamp : Date.now();
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);

        this.animatedAchievements = Object.keys(targets).reduce((result, key) => {
          result[key] = Math.round(startValues[key] + ((targets[key] - startValues[key]) * eased));
          return result;
        }, {});

        if (progress < 1 && typeof window !== 'undefined') {
          this.achievementAnimationTimer = window.setTimeout(() => step(Date.now()), 16);
        } else {
          this.achievementAnimationTimer = null;
        }
      };

      if (typeof window !== 'undefined') {
        this.achievementAnimationTimer = window.setTimeout(() => step(Date.now()), 16);
      } else {
        this.animatedAchievements = targets;
      }
    },
    formatAchievementValue(item) {
      const resolvedValue = item.animatedValue;

      if (item.format === 'percent') {
        return `${Math.max(0, resolvedValue)}%`;
      }

      return new Intl.NumberFormat('ar-SA').format(Math.max(0, resolvedValue));
    },
    scrollToSection(sectionId) {
      const element = document.getElementById(sectionId);

      if (!element) {
        return;
      }

      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    openProgram(program) {
      if (!program?.available || !program.route) {
        return;
      }

      this.$router.push(program.route).catch(() => {});
    },
    handleScroll() {
      this.scrolled = window.scrollY > 20;
      if (!this.programsRevealed) {
        const programsRef = this.$refs.programsSection;
        const programsSection = programsRef?.$el || programsRef;

        if (programsSection) {
          const programBounds = programsSection.getBoundingClientRect();
          const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
          this.programsRevealed = programBounds.top <= viewportHeight * 0.76 && programBounds.bottom >= viewportHeight * 0.16;
        }
      }

      if (!this.achievementAnimationStarted) {
        const section = this.$refs.achievementsSection;

        if (!section || window.scrollY <= 0) {
          return;
        }

        const bounds = section.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
        this.achievementSectionVisible = bounds.top <= viewportHeight * 0.78 && bounds.bottom >= viewportHeight * 0.22;
        this.maybeStartStatsAnimation();
        this.maybeStartAchievementAnimation();
      }
    },
    handleWindowClick() {
      this.accountMenuOpen = false;
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
       if (!item || item.disabled) return;
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
     async submitLogout() {
       this.accountMenuOpen = false;
       this.profileDialogOpen = false;
       await this.logout();
       this.$router.replace({ name: 'home' }).catch(() => {});
     },
    openLoginDialog(redirectPath = '') {
      this.loginRedirectPath = redirectPath || this.$route.query.redirect || '';
      this.loginDialogOpen = true;
      const query = { ...this.$route.query, login: '1' };
      if (this.loginRedirectPath) query.redirect = this.loginRedirectPath;
      this.$router.replace({ name: 'home', query, hash: this.$route.hash }).catch(() => {});
    },
    closeLoginDialog() {
      this.loginDialogOpen = false;
      const query = { ...this.$route.query };
      delete query.login;
      delete query.redirect;
      this.$router.replace({ name: 'home', query, hash: this.$route.hash }).catch(() => {});
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
       if (!this.loginForm.loginCode || !this.loginForm.password) return;
       try {
         await this.login(this.loginForm);
         this.accountMenuOpen = false;
         this.closeLoginDialog();
         this.$router.replace(resolveUserHomeRoute(this.currentUser)).catch(() => {});
       } catch (e) {
         // Handle error automatically
       }
     },
};
