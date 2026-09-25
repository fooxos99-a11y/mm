export default {
  toggleAttendance(studentId) {
    this.attendanceChecked = this.attendanceChecked.includes(studentId)
      ? this.attendanceChecked.filter((id) => id !== studentId)
      : [...this.attendanceChecked, studentId];

    this.queueAttendanceSave();
  },
  toggleVisibleAttendance() {
    const visibleStudentIds = this.attendanceStudents.map((student) => student.id);

    if (this.allVisibleChecked) {
      this.attendanceChecked = this.attendanceChecked.filter((id) => !visibleStudentIds.includes(id));
    } else {
      const checkedIds = new Set(this.attendanceChecked);

      visibleStudentIds.forEach((studentId) => checkedIds.add(studentId));
      this.attendanceChecked = Array.from(checkedIds);
    }

    this.queueAttendanceSave();
  },
  queueAttendanceSave() {
    if (!this.selectedCourseId) {
      return;
    }

    this.saveStatusText = 'سيتم الحفظ تلقائيًا...';

    if (this.attendanceSaveTimer) {
      clearTimeout(this.attendanceSaveTimer);
    }

    this.attendanceSaveTimer = setTimeout(() => {
      this.attendanceSaveTimer = null;
      this.saveAttendance();
    }, 250);
  },
  async saveAttendance() {
    try {
      this.isSavingAttendance = true;
      this.saveStatusText = 'جارٍ حفظ التحضير...';
      const branchCode = this.managedBranchId || this.attendanceBranchId;
      const presentStudents = this.students.filter((student) => student.branchId === branchCode
        && this.attendanceChecked.includes(student.id));
      await this.setManualAttendance({
        courseId: this.selectedCourseId,
        branchCode,
        presentStudents: presentStudents.map((student) => ({
          loginId: student.loginId,
          studentName: student.name,
          studentId: student.id,
        })),
      });
      this.saveStatusText = 'تم حفظ التحضير';
    } catch (error) {
      this.saveStatusText = 'تعذر حفظ التحضير';
      this.$toast.error(error?.response?.data?.message || 'تعذر حفظ الحضور');
    } finally {
      this.isSavingAttendance = false;
    }
  },
};
