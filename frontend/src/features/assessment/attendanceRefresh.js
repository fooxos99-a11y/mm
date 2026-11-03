// Both supervisor screens read the same persisted attendance as self confirmation.
export default {
  mounted() {
    this.attendanceRefreshDisposed = false;
    this.attendanceRefreshTimer = window.setInterval(() => this.refreshAttendanceSilently(), 5000);
    this.attendanceRefreshOnFocus = () => this.refreshAttendanceSilently();
    window.addEventListener('focus', this.attendanceRefreshOnFocus);
    this.refreshAttendanceSilently();
  },
  beforeUnmount() {
    this.attendanceRefreshDisposed = true;
    window.clearInterval(this.attendanceRefreshTimer);
    window.removeEventListener('focus', this.attendanceRefreshOnFocus);
  },
  methods: {
    async refreshAttendanceSilently() {
      if (this.attendanceRefreshDisposed || this.attendanceRefreshBusy || document.visibilityState === 'hidden'
        || this.dashboardLoading || this.attendanceSaveTimer || this.isSavingAttendance
        || this.attendanceRemovedIds?.length || this.saveStatusText === 'تعذر حفظ التحضير') return;
      const results = this.isAttendanceResultsType && !this.isAttendanceMode;
      const checklist = this.isAttendanceMode;
      if ((!results && !checklist) || (results && (this.resultsLoading || !this.hasSelectedResultsSection))) return;
      this.attendanceRefreshBusy = true;
      try {
        if (results) await this.loadResultsPage(this.resultsPage, true, true);
        else await this.loadDashboardSnapshot({ background: true });
      } catch {
        // Retain the last confirmed state until the next successful refresh.
      } finally { this.attendanceRefreshBusy = false; }
    },
  },
};
