import {
  calculateSubmissionScore,
  formatScoreValue,
  hasPendingManualReview,
  resolveCorrectAnswer as resolveCorrectAnswerValue,
  resolveStudentAnswer as resolveStudentAnswerValue,
} from './resultModel.mjs';

export default {
  requestCourseDelete(course) {
    if (!this.canManageCourses || !course?.id) return;
    this.courseDeleteId = course.id;
    this.courseDeleteTitle = course.title || '';
    this.courseDeleteEntityType = course.entityType === 'task' ? 'task' : 'course';
    this.courseDeleteDialogOpen = true;
  },
  closeCourseDeleteDialog() {
    this.courseDeleteDialogOpen = false;
    this.courseDeleteId = '';
    this.courseDeleteTitle = '';
    this.courseDeleteEntityType = 'course';
    this.deletingCourseId = '';
  },
  async confirmCourseDelete() {
    if (!this.courseDeleteId) return;
    const courseId = this.courseDeleteId;
    this.deletingCourseId = courseId;
    try {
      await this.deleteCourse(courseId);
      this.$toast.success(this.courseDeleteEntityType === 'task' ? 'تم حذف المهمة' : 'تم حذف الدورة');
      this.closeCourseDeleteDialog();
    } catch (error) {
      const fallback = this.courseDeleteEntityType === 'task' ? 'تعذر حذف المهمة' : 'تعذر حذف الدورة';
      this.$toast.error(error?.response?.data?.message || fallback);
    } finally {
      this.deletingCourseId = '';
    }
  },
  countStudentAbsences(loginId) {
    if (!loginId) return 0;
    if (!this.isAttendanceMode) return this.students.find((student) => student.loginId === loginId)?.absenceCount || 0;
    const eligibleIds = this.attendanceEligibleCourses.map((course) => course.id);
    const presentIds = new Set(this.attendance
      .filter((record) => record.loginId === loginId).map((record) => record.courseId));
    return eligibleIds.filter((courseId) => !presentIds.has(courseId)).length;
  },
  toggleAttendance(studentId) {
    this.attendanceChecked = this.attendanceChecked.includes(studentId)
      ? this.attendanceChecked.filter((id) => id !== studentId)
      : [...this.attendanceChecked, studentId];
    this.queueAttendanceSave();
  },
  toggleVisibleAttendance() {
    const visibleIds = this.attendanceStudents.map((student) => student.id);
    if (this.allVisibleChecked) {
      this.attendanceChecked = this.attendanceChecked.filter((id) => !visibleIds.includes(id));
    } else {
      const checkedIds = new Set(this.attendanceChecked);
      visibleIds.forEach((studentId) => checkedIds.add(studentId));
      this.attendanceChecked = Array.from(checkedIds);
    }
    this.queueAttendanceSave();
  },
  queueAttendanceSave() {
    if (!this.attendanceCourseId) return;
    this.saveStatusText = 'سيتم الحفظ تلقائيًا...';
    if (this.attendanceSaveTimer) clearTimeout(this.attendanceSaveTimer);
    this.attendanceSaveTimer = setTimeout(() => {
      this.attendanceSaveTimer = null;
      this.saveAttendance();
    }, 250);
  },
  async saveAttendance() {
    try {
      this.isSavingAttendance = true;
      this.saveStatusText = 'جارٍ حفظ التحضير...';
      const presentStudents = this.students.filter((student) => student.branchId === this.effectiveAttendanceBranchId
        && this.attendanceChecked.includes(student.id));
      await this.setManualAttendance({
        courseId: this.attendanceCourseId,
        branchCode: this.effectiveAttendanceBranchId,
        presentStudents: presentStudents.map((student) => ({
          loginId: student.loginId, studentName: student.name, studentId: student.id,
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
  resolveSubmissionScore(submission) {
    return calculateSubmissionScore(this.resolveSubmissionQuestions(submission), submission);
  },
  resolveSubmissionQuestions(submission) {
    if (this.isFinalExamResultsSection) {
      return this.finalExamQuestions.filter((question) => question.branchCode === this.effectiveResultsBranchId);
    }
    if (this.isTaskResultsSection) {
      const task = this.taskEligibleCourses.find((course) => course.id === submission?.courseId);
      return task?.taskQuestions || [];
    }
    return this.selectedResultsQuestions;
  },
  formatScore(value) { return formatScoreValue(value); },
  formatRowScore(score, submission) {
    if (!submission) return 'غير مرسل';
    if (hasPendingManualReview(this.resolveSubmissionQuestions(submission), submission)) {
      return 'بانتظار التصحيح اليدوي';
    }
    if (!this.selectedResultsTotalPoints) return `${(submission.answers || []).length} إجابة`;
    return `${this.formatScore(score)} / ${this.formatScore(this.selectedResultsTotalPoints)}`;
  },
  taskReviewStatusLabel(status) {
    return { approved: 'معتمد', rejected: 'مرفوض', pending: 'بانتظار المراجعة' }[status]
      || 'بانتظار المراجعة';
  },
  resolveStudentAnswer(answer) { return resolveStudentAnswerValue(answer); },
  resolveAnswerAttachment(answer) {
    if (!answer?.fileName || !answer?.fileDataUrl) return null;
    return { fileName: answer.fileName, fileType: answer.fileType || '', fileDataUrl: answer.fileDataUrl };
  },
  resolveSubmissionAttachment(submission) {
    return (submission?.answers || []).map((answer) => this.resolveAnswerAttachment(answer)).find(Boolean) || null;
  },
  resolveCorrectAnswer(question) { return resolveCorrectAnswerValue(question); },
};
