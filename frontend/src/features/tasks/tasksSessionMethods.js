export default {
  restoreStudentSession() {
    this.studentLoginId = '';
    if (!this.authenticatedStudentLogin) return;

    const foundStudent = (this.publicSnapshot?.students || [])
      .find((student) => student.loginId === this.authenticatedStudentLogin);
    if (!foundStudent) return;

    this.studentLoginId = foundStudent.loginId;
  },
};
