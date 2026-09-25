import { buildProgramIndicators } from '../../utils/programIndicators';

export default {
  overviewBranchOptions() {
    if (this.managedBranchId) {
      return [{
        label: this.managedBranchId === 'female' ? 'معلمات' : 'معلمين',
        value: this.managedBranchId,
      }];
    }

    return [
      { label: 'الكل', value: 'all' },
      { label: 'معلمين', value: 'male' },
      { label: 'معلمات', value: 'female' },
    ];
  },
  overviewStudents() {
    const students = this.dashboardSnapshot?.students || [];
    if (this.effectiveOverviewBranch === 'all') return students;
    return students.filter((student) => student.branchId === this.effectiveOverviewBranch);
  },
  overviewAttendance() {
    const attendance = this.dashboardSnapshot?.attendance || [];
    if (this.effectiveOverviewBranch === 'all') return attendance;

    const loginIds = new Set(this.overviewStudents.map((student) => student.loginId).filter(Boolean));
    return attendance.filter((record) => loginIds.has(record.loginId));
  },
  overviewSubmissions() {
    const submissions = this.dashboardSnapshot?.submissions || [];
    if (this.effectiveOverviewBranch === 'all') return submissions;

    const loginIds = new Set(this.overviewStudents.map((student) => student.loginId).filter(Boolean));
    return submissions.filter((item) => loginIds.has(item.loginId));
  },
  dashboardIndicators() {
    if (this.dashboardSnapshot?.snapshotMode === 'shell') {
      return this.dashboardSnapshot.overviewIndicators?.[this.effectiveOverviewBranch] || [];
    }
    return buildProgramIndicators({
      students: this.overviewStudents,
      courses: this.dashboardSnapshot?.courses || [],
      submissions: this.overviewSubmissions,
      attendance: this.overviewAttendance,
    });
  },
  dashboardIndicatorsSignature() {
    return this.dashboardIndicators
      .map((indicator) => `${indicator.key}:${indicator.progress}:${indicator.display}`)
      .join('|');
  },
  recentNotifications() {
    return (this.dashboardSnapshot?.notifications || []).slice(0, 3);
  },
};
