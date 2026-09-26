import { buildResultDetailCards } from './resultModel.mjs';

export const RESULTS_FINAL_EXAM_VALUE = '__final_exam__';
export const RESULTS_TASKS_VALUE = '__tasks__';

const resolveDisplayedRowsSource = (vm) => {
  if (vm.isFinalExamResultsSection) return vm.finalExamRows;
  if (vm.isTaskResultsSection) return vm.taskRows;
  return vm.isAttendanceResultsType ? vm.attendanceRows : vm.assessmentRows;
};

// Vue merges these members into the component, so `this` is the component instance.
export default /** @type {Record<string, any>} */ ({
  managedBranchId() {
    if (this.currentUser?.role === 'male_manager') return 'male';
    if (this.currentUser?.role === 'female_manager') return 'female';
    return '';
  },
  canManageCourses() { return this.currentUser?.role === 'admin'; },
  isDeletingCourse() { return Boolean(this.deletingCourseId); },
  effectiveAttendanceBranchId() { return this.managedBranchId || this.attendanceBranchId; },
  effectiveResultsBranchId() { return this.managedBranchId || this.resultsBranchId; },
  courses() {
    if (this.isAttendanceMode) return this.dashboardSnapshot?.courses || [];
    return this.resultsCatalog.map((course) => this.resultSnapshot?.courses?.find((item) => item.id === course.id) || course);
  },
  students() { return (this.isAttendanceMode ? this.dashboardSnapshot : this.resultSnapshot)?.students || []; },
  attendance() { return (this.isAttendanceMode ? this.dashboardSnapshot : this.resultSnapshot)?.attendance || []; },
  submissions() { return (this.isAttendanceMode ? this.dashboardSnapshot : this.resultSnapshot)?.submissions || []; },
  finalExamQuestions() { return (this.isAttendanceMode ? this.dashboardSnapshot : this.resultSnapshot)?.finalExamQuestions || []; },
  finalExamSubmissions() { return (this.isAttendanceMode ? this.dashboardSnapshot : this.resultSnapshot)?.finalExamSubmissions || []; },
  isSnapshotTruncated() {
    const metadata = this.isAttendanceMode ? (this.dashboardSnapshot?.snapshotMeta || {}) : {};
    return Object.values(metadata).some((dataset) => dataset?.truncated === true);
  },
  courseOptions() {
    return this.courses.map((course) => ({ label: course.title, value: course.id, course }));
  },
  attendanceEligibleCourses() { return this.courses.filter((course) => course.entityType !== 'task'); },
  assessmentEligibleCourses() { return this.courses.filter((course) => course.entityType !== 'task'); },
  taskEligibleCourses() { return this.courses.filter((course) => course.entityType === 'task'); },
  resultsTypeOptions() {
    return [
      { label: 'التحضير', value: 'attendance' },
      { label: 'الاختبار القبلي', value: 'pre' },
      { label: 'الاختبار البعدي', value: 'post' },
    ];
  },
  resultsCourseOptions() {
    const courses = this.assessmentEligibleCourses.map((course) => ({
      label: course.title, value: course.id, course,
    }));
    const tasks = this.taskEligibleCourses.map((course) => ({
      label: course.title || 'مهمة أدائية', value: `task:${course.id}`, course,
    }));
    return courses.concat([...tasks, { label: 'الاختبار النهائي', value: RESULTS_FINAL_EXAM_VALUE }]);
  },
  selectedResultsCourse() {
    return this.courses.find((course) => course.id === this.resultsCourseId) || null;
  },
  selectedTaskResultCourse() {
    if (!this.isTaskResultsSection) return null;
    const selectedTaskId = this.resultsCourseId.startsWith('task:') ? this.resultsCourseId.slice(5) : '';
    if (selectedTaskId) {
      return this.taskEligibleCourses.find((course) => course.id === selectedTaskId) || null;
    }
    const courseId = this.selectedResultRow?.submission?.courseId || '';
    return this.taskEligibleCourses.find((course) => course.id === courseId) || null;
  },
  isTaskResultsSection() {
    return this.resultsCourseId === RESULTS_TASKS_VALUE || this.resultsCourseId.startsWith('task:');
  },
  isFinalExamResultsSection() { return this.resultsCourseId === RESULTS_FINAL_EXAM_VALUE; },
  isCourseResultsSection() {
    return Boolean(this.resultsCourseId) && !this.isTaskResultsSection && !this.isFinalExamResultsSection;
  },
  hasSelectedResultsSection() {
    return this.isTaskResultsSection || this.isFinalExamResultsSection
      || (Boolean(this.selectedResultsCourse) && Boolean(this.resultsType));
  },
  selectedResultsSectionLabel() {
    if (this.isTaskResultsSection) return this.selectedTaskResultCourse?.title || 'المهام الأدائية';
    if (this.isFinalExamResultsSection) return 'الاختبار النهائي';
    return this.selectedResultsCourse?.title || 'النتائج';
  },
  courseDeleteEntityLabel() { return this.courseDeleteEntityType === 'task' ? 'مهمة' : 'دورة'; },
  selectedResultsQuestions() {
    if (this.isFinalExamResultsSection) {
      return this.finalExamQuestions.filter((question) => question.branchCode === this.effectiveResultsBranchId);
    }
    if (this.isTaskResultsSection) {
      const courseId = this.selectedResultRow?.submission?.courseId || '';
      const task = this.taskEligibleCourses.find((course) => course.id === courseId);
      return task ? task.taskQuestions || [] : this.taskEligibleCourses.flatMap((course) => course.taskQuestions || []);
    }
    if (!this.selectedResultsCourse) return [];
    if (this.resultsType === 'pre') return this.selectedResultsCourse.preQuestions || [];
    if (this.resultsType === 'post') return this.selectedResultsCourse.postQuestions || [];
    return [];
  },
  selectedResultsTotalPoints() {
    return this.selectedResultsQuestions.reduce((sum, question) => sum + Number(question.points || 0), 0);
  },
  isAttendanceMode() { return this.panelMode === 'attendance'; },
  isAttendanceResultsType() { return this.isCourseResultsSection && this.resultsType === 'attendance'; },
  showStudentFilter() { return this.isAttendanceResultsType; },
  studentFilterLabel() { return 'حالة المعلمين'; },
  attendanceStudents() {
    return this.students.filter((student) => student.branchId === this.effectiveAttendanceBranchId);
  },
  displayedAttendanceStudents() {
    return [...this.attendanceStudents].sort((left, right) => {
      const checkedDiff = Number(this.attendanceChecked.includes(right.id))
        - Number(this.attendanceChecked.includes(left.id));
      return checkedDiff || (left.name || '').localeCompare(right.name || '', 'ar');
    });
  },
  visibleCheckedCount() {
    return this.attendanceStudents.filter((student) => this.attendanceChecked.includes(student.id)).length;
  },
  allVisibleChecked() {
    return this.attendanceStudents.length > 0 && this.visibleCheckedCount === this.attendanceStudents.length;
  },
  selectedAttendanceRecords() {
    return this.attendance.filter((record) => record.courseId === this.attendanceCourseId);
  },
  activeResultsTypeLabel() {
    if (this.isTaskResultsSection) return this.selectedTaskResultCourse?.title || 'المهام الأدائية';
    if (this.isFinalExamResultsSection) return 'الاختبار النهائي';
    return this.resultsTypeOptions.find((option) => option.value === this.resultsType)?.label || 'النتائج';
  },
  activeBranchLabel() {
    return this.branchOptions.find((option) => option.value === this.effectiveResultsBranchId)?.label || 'الكل';
  },
  studentFilterOptions() {
    if (this.isAttendanceResultsType) {
      return [
        { label: 'جميع المعلمين', value: 'all' },
        { label: 'الحاضرين', value: 'present' },
        { label: 'الغائبين', value: 'absent' },
        { label: 'غائبين 3 مرات فأكثر', value: 'absent3plus' },
      ];
    }
    return [];
  },
  resultsBranchStudents() {
    return this.students
      .filter((student) => student.branchId === this.effectiveResultsBranchId)
      .sort((left, right) => (left.name || '').localeCompare(right.name || '', 'ar'));
  },
  attendanceRows() {
    const presentLogins = new Set(this.attendance
      .filter((record) => record.courseId === this.resultsCourseId)
      .map((record) => record.loginId).filter(Boolean));
    return this.resultsBranchStudents.map((student) => ({
      key: `attendance-${student.id}`,
      name: student.name,
      loginId: student.loginId,
      present: presentLogins.has(student.loginId),
      absenceCount: this.countStudentAbsences(student.loginId),
    }));
  },
  attendancePresentCount() { return this.isAttendanceMode ? this.attendanceRows.filter((row) => row.present).length : (this.resultSnapshot?.summary?.present || 0); },
  attendanceAbsentCount() { return this.isAttendanceMode ? this.attendanceRows.filter((row) => !row.present).length : (this.resultSnapshot?.summary?.absent || 0); },
  assessmentRows() {
    return this.resultsBranchStudents.map((student) => {
      const submission = this.submissions.find((item) => item.courseId === this.resultsCourseId
        && item.assessmentType === this.resultsType && item.loginId === student.loginId) || null;
      const score = submission ? this.resolveSubmissionScore(submission) : null;
      return {
        key: `submission-${student.id}`,
        name: student.name,
        loginId: student.loginId,
        submission,
        attachment: this.resolveSubmissionAttachment(submission),
        score,
        scoreLabel: this.formatRowScore(score, submission),
      };
    });
  },
  taskRows() {
    const tasks = this.selectedTaskResultCourse ? [this.selectedTaskResultCourse] : this.taskEligibleCourses;
    return tasks.flatMap((course) => this.resultsBranchStudents.map((student) => {
      const submission = this.submissions.find((item) => item.courseId === course.id
        && item.assessmentType === 'tasks' && item.loginId === student.loginId) || null;
      const score = submission ? this.resolveSubmissionScore(submission) : null;
      const total = (course.taskQuestions || []).reduce((sum, question) => sum + Number(question.points || 0), 0);
      const scoreText = submission && score !== null
        ? `${this.formatScore(score)} / ${this.formatScore(total)}`
        : 'بانتظار التصحيح اليدوي';
      return {
        key: `task-${course.id}-${student.id}`,
        name: student.name,
        loginId: student.loginId,
        sectionLabel: course.title,
        submission,
        attachment: this.resolveSubmissionAttachment(submission),
        score,
        scoreLabel: submission
          ? `${course.title}: ${scoreText} – ${this.taskReviewStatusLabel(submission.taskReviewStatus)}`
          : `${course.title}: غير مرسل`,
      };
    }));
  },
  finalExamRows() {
    return this.resultsBranchStudents.map((student) => {
      const submission = this.finalExamSubmissions.find((item) => item.branchCode === this.effectiveResultsBranchId
        && item.loginCode === student.loginId) || null;
      const score = this.resolveSubmissionScore(submission);
      return {
        key: `final-${student.id}`,
        name: student.name,
        loginId: student.loginId,
        submission,
        attachment: this.resolveSubmissionAttachment(submission),
        score,
        scoreLabel: this.formatRowScore(score, submission),
      };
    });
  },
  displayedRows() {
    const source = resolveDisplayedRowsSource(this);
    if (!this.isAttendanceMode) return source;
    return source.filter((row) => {
      if (!this.studentFilter || this.studentFilter === 'all') return true;
      if (this.isAttendanceResultsType) {
        if (this.studentFilter === 'present') return row.present;
        if (this.studentFilter === 'absent') return !row.present;
        if (this.studentFilter === 'absent3plus') return row.absenceCount >= 3;
        return true;
      }
      return row.loginId === this.studentFilter;
    });
  },
  selectedResultRow() {
    return this.displayedRows.find((row) => row.key === this.selectedResultLoginId) || null;
  },
  resultDetailCards() {
    if (!this.selectedResultRow?.submission) return [];
    const taskMode = this.selectedTaskResultCourse?.taskMode || this.selectedResultsCourse?.taskMode || '';
    return buildResultDetailCards(this.selectedResultsQuestions, this.selectedResultRow.submission, {
      richTextAnswers: this.isTaskResultsSection && taskMode === 'document',
      attachmentResolver: this.resolveAnswerAttachment,
    });
  },
  hasManualReviewAnswers() {
    return this.resultDetailCards.some(detail => detail.requiresManualReview);
  },
});
