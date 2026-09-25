import { fetchPublicSnapshot } from '../../services/api';

export default {
  resolveAuthenticatedFallbackRoute() {
    if (this.currentUser?.role === 'trainee') {
      return { name: 'trainee' };
    }

    if (this.currentUser?.role === 'reciter') {
      return { name: 'reciter' };
    }

    if (['admin', 'male_manager', 'female_manager'].includes(this.currentUser?.role)) {
      return { name: 'dashboard' };
    }

    return { name: 'home' };
  },
  redirectAuthenticatedNonStudent() {
    if (!this.isAuthenticatedNonStudent) {
      return false;
    }

    const targetRoute = this.resolveAuthenticatedFallbackRoute();

    if (targetRoute?.name && this.$route.name !== targetRoute.name) {
      this.$router.replace(targetRoute);
    }

    return true;
  },
  fetchPublicSnapshotWithTimeout(timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        reject(new Error('snapshot-timeout'));
      }, timeoutMs);

      fetchPublicSnapshot()
        .then((payload) => {
          window.clearTimeout(timeoutId);
          resolve(payload);
        })
        .catch((error) => {
          window.clearTimeout(timeoutId);
          reject(error);
        });
    });
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
  isWindowActive(windowValue) {
    const windowMeta = this.getWindowMeta(windowValue);

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
  async loadPublicData() {
    if (this.publicLoadingGuardTimer) {
      window.clearTimeout(this.publicLoadingGuardTimer);
      this.publicLoadingGuardTimer = null;
    }

    this.publicLoading = true;
    this.publicError = '';
    this.publicLoadingGuardTimer = window.setTimeout(() => {
      if (!this.publicLoading || this.publicSnapshot) {
        return;
      }

      this.publicLoading = false;
      this.studentResolved = true;
      this.publicError = 'انتهت مهلة التحميل. تأكد من تشغيل السيرفر ثم أعد المحاولة.';

    }, 12000);

    try {
      this.publicSnapshot = Object.freeze(await this.fetchPublicSnapshotWithTimeout());
      this.restoreStudentSession();
    } catch (error) {
      if (error?.message === 'snapshot-timeout') {
        this.publicError = 'انتهت مهلة التحميل. تأكد من تشغيل السيرفر ثم أعد المحاولة.';
      } else {
        this.publicError = error?.response?.data?.message || error?.message || 'تعذر تحميل بيانات المهام الأدائية.';
      }
    } finally {
      if (this.publicLoadingGuardTimer) {
        window.clearTimeout(this.publicLoadingGuardTimer);
        this.publicLoadingGuardTimer = null;
      }

      this.publicLoading = false;
      this.studentResolved = true;

    }
  },
};
