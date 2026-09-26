// Vue merges these members into the component, so `this` is the component instance.
export default /** @type {Record<string, any>} */ ({
    attendanceStudents() {
      return this.students.filter((student) => student.branchId === (this.managedBranchId || this.attendanceBranchId));
    },
    displayedAttendanceStudents() {
      return [...this.attendanceStudents]
        .sort((left, right) => {
          const leftChecked = this.attendanceChecked.includes(left.id) ? 1 : 0;
          const rightChecked = this.attendanceChecked.includes(right.id) ? 1 : 0;

          if (leftChecked !== rightChecked) {
            return rightChecked - leftChecked;
          }

          return (left.name || '').localeCompare(right.name || '', 'ar');
        });
    },
    visibleCheckedCount() {
      return this.attendanceStudents.filter((student) => this.attendanceChecked.includes(student.id)).length;
    },
    allVisibleChecked() {
      return this.attendanceStudents.length > 0 && this.visibleCheckedCount === this.attendanceStudents.length;
    },
    selectedAttendanceRecords() {
      return this.attendance.filter((record) => record.courseId === this.selectedCourseId);
    },
});
