import {
  gradeFinalExamSubmission,
  isFinalExamAvailable,
  resolveFinalExamPreviewKind,
  resolveFinalExamQuestions,
  resolveFinalExamStudent,
  resolveFinalExamSubmission,
} from './publicFinalExamModel.mjs';

export default {
  currentUser() {
    return this.$store?.state?.currentUser || null;
  },
  authenticatedStudentLogin() {
    return ['student', 'trainee'].includes(this.currentUser?.role)
      ? String(this.currentUser.loginCode || '').trim()
      : '';
  },
  student() {
    return resolveFinalExamStudent(this.publicSnapshot?.students, this.studentLoginId);
  },
  branchCode() {
    return this.student?.branchId || 'male';
  },
  branchSetting() {
    return this.publicSnapshot?.finalExamSettings?.[this.branchCode] || { isEnabled: false, closesAt: null };
  },
  questions() {
    return resolveFinalExamQuestions(this.publicSnapshot?.finalExamQuestions, this.branchCode);
  },
  isEnabled() {
    return isFinalExamAvailable(this.student, this.branchSetting, this.currentTimestamp);
  },
  existingSubmission() {
    return this.student
      ? resolveFinalExamSubmission(this.publicSnapshot?.finalExamSubmissions, this.student.loginId)
      : null;
  },
  canInteract() {
    return Boolean(this.student && this.isEnabled && !this.existingSubmission);
  },
  gradedSubmission() {
    return gradeFinalExamSubmission(this.questions, this.existingSubmission);
  },
  previewKind() {
    return resolveFinalExamPreviewKind(this.previewAttachment);
  },
};
