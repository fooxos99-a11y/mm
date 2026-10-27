export default {
  toggleAttendance(studentId) {
    if (this.selectedAttendanceSession && !this.selectedAttendanceSession.isOpen) return;
    if (this.selectedAttendanceSession?.id) {
      const removed = new Set(this.attendanceRemovedIds || []);
      if (this.attendanceChecked.includes(studentId)) removed.add(studentId);
      else removed.delete(studentId);
      this.attendanceRemovedIds = [...removed];
    }
    this.attendanceChecked = this.attendanceChecked.includes(studentId)
      ? this.attendanceChecked.filter((id) => id !== studentId)
      : [...this.attendanceChecked, studentId];

    this.queueAttendanceSave();
  },
  toggleVisibleAttendance() {
    if (this.selectedAttendanceSession && !this.selectedAttendanceSession.isOpen) return;
    if (this.selectedAttendanceSession?.id) {
      const removed = new Set(this.attendanceRemovedIds || []);
      for (const student of this.attendanceStudents) {
        if (this.allVisibleChecked) removed.add(student.id);
        else removed.delete(student.id);
      }
      this.attendanceRemovedIds = [...removed];
    }
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
      this.attendanceSavePromise = this.saveAttendance();
    }, 250);
  },
  async saveAttendance() {
    if (this.selectedAttendanceSession && !this.selectedAttendanceSession.isOpen) return;
    const removedIds = [...(this.attendanceRemovedIds || [])];
    try {
      this.isSavingAttendance = true;
      this.saveStatusText = 'جارٍ حفظ التحضير...';
      const branchCode = this.managedBranchId || this.attendanceBranchId;
      const presentStudents = this.students.filter((student) => student.branchId === branchCode
        && this.attendanceChecked.includes(student.id));
      await this.setManualAttendance({
        courseId: this.selectedCourseId,
        ...(this.selectedAttendanceSession?.id ? { sessionId: this.selectedAttendanceSession.id,
          removedStudents: this.students.filter(student => student.branchId === branchCode && removedIds.includes(student.id)).map(student => student.loginId),
        } : {}),
        branchCode,
        presentStudents: presentStudents.map((student) => ({
          loginId: student.loginId,
          studentName: student.name,
          studentId: student.id,
        })),
      });
      this.attendanceRemovedIds = (this.attendanceRemovedIds || []).filter(id => !removedIds.includes(id));
      this.saveStatusText = 'تم حفظ التحضير';
    } catch (error) {
      this.saveStatusText = 'تعذر حفظ التحضير';
      this.$toast.error(error?.response?.data?.message || 'تعذر حفظ الحضور');
    } finally {
      this.isSavingAttendance = false;
    }
  },
};
