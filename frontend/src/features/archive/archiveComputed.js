export default {
  selectedArchive() {
    return this.archives.find((archive) => archive.id === this.selectedArchiveId) || null;
  },
  hasSearchResults() {
    return this.searchPerformed && this.studentSearchQuery.trim().length > 0;
  },
  canShowArchiveWorkspace() {
    return Boolean(this.selectedArchiveId || this.hasSearchResults);
  },
  displayedStudents() {
    const source = this.hasSearchResults ? this.searchResults : (this.archiveData?.students || []);

    return source.map((student) => ({
      ...student,
      archive_name: student.archive_name || this.archiveData?.archive?.name || this.selectedArchive?.name || '',
    }));
  },
  displayedStudentsTitle() {
    return this.hasSearchResults ? 'نتائج البحث' : 'الطلاب المؤرشفون';
  },
  displayedStudentsEmptyText() {
    return this.hasSearchResults
      ? 'لا يوجد طلاب مطابقون لهذا الاسم في أي دفعة'
      : 'لا يوجد طلاب في هذا الأرشيف';
  },
  archivedStudentCompletionStatus() {
    return this.selectedArchivedStudentDetail?.student?.completionResult
      ? this.completionStatusLabel(this.selectedArchivedStudentDetail.student.completionResult.status)
      : '';
  },
  archivedStudentCompletionRows() {
    return this.completionRequirementRows(
      this.selectedArchivedStudentDetail?.student?.completionResult?.details,
    );
  },
  archivedStudentRegistrationRows() {
    return this.registrationProfileRows(this.selectedArchivedStudentDetail?.student?.registrationProfile);
  },
  archivedStudentStats() {
    return this.buildArchivedStudentStats(this.selectedArchivedStudentDetail);
  },
};
