import { fetchPublicSnapshot } from '../../services/api';

export default {
  stopPublicAutoRefresh() {
    if (!this.publicAutoRefreshTimer) return;
    window.clearInterval(this.publicAutoRefreshTimer);
    this.publicAutoRefreshTimer = null;
  },
  fetchPublicSnapshotWithTimeout(timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => reject(new Error('snapshot-timeout')), timeoutMs);
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
  async loadPublicData() {
    if (this.publicLoadingGuardTimer) window.clearTimeout(this.publicLoadingGuardTimer);
    this.publicLoading = true;
    this.publicError = '';
    this.publicLoadingGuardTimer = window.setTimeout(() => {
      if (!this.publicLoading || this.publicSnapshot) return;
      this.publicLoading = false;
      this.studentResolved = true;
      this.publicError = 'انتهت مهلة التحميل. تأكد من تشغيل السيرفر ثم أعد المحاولة.';
    }, 12000);

    try {
      this.publicSnapshot = await this.fetchPublicSnapshotWithTimeout();
      this.restoreStudentSession();
    } catch (error) {
      this.publicError = error?.message === 'snapshot-timeout'
        ? 'انتهت مهلة التحميل. تأكد من تشغيل السيرفر ثم أعد المحاولة.'
        : error?.response?.data?.message || error?.message || 'تعذر تحميل بيانات الاختبار النهائي.';
    } finally {
      if (this.publicLoadingGuardTimer) window.clearTimeout(this.publicLoadingGuardTimer);
      this.publicLoadingGuardTimer = null;
      this.publicLoading = false;
      this.studentResolved = true;
      if (this.isEnabled || this.existingSubmission) this.stopPublicAutoRefresh();
    }
  },
  async refreshPublicSnapshotSilently() {
    if (this.publicLoading || this.submitting || this.publicRefreshInFlight) return;
    this.publicRefreshInFlight = true;
    try {
      this.publicSnapshot = await this.fetchPublicSnapshotWithTimeout(8000);
      if (!this.studentLoginId) this.restoreStudentSession();
      if (this.isEnabled || this.existingSubmission) this.stopPublicAutoRefresh();
    } catch {
      // Foreground loading presents persistent errors; polling failures remain silent.
    } finally {
      this.publicRefreshInFlight = false;
    }
  },
};
