import { resolveFinalExamStudent } from './publicFinalExamModel.mjs';

export default {
  restoreStudentSession() {
    this.studentLoginId = '';
    if (!this.authenticatedStudentLogin) return;

    const student = resolveFinalExamStudent(
      this.publicSnapshot?.students,
      this.authenticatedStudentLogin,
    );
    if (!student) return;

    this.studentLoginId = student.loginId;
  },
};
