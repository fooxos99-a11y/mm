export default {
  openCreateDialog() {
    this.createDialog = true;
  },
  openArchiveAllDialog() {
    this.archiveAllDialog = true;
  },
  scheduleArchivedStudentSearch() {
    if (this.searchDebounceId) clearTimeout(this.searchDebounceId);

    this.searchDebounceId = window.setTimeout(() => {
      this.searchDebounceId = null;
      this.searchArchivedStudents();
    }, 300);
  },
  clearArchivedStudentDetail() {
    this.selectedArchivedStudentId = '';
    this.selectedArchivedStudentDetail = null;
    this.detailDialogOpen = false;
  },
  closeArchivedStudentDetailDialog() {
    this.clearArchivedStudentDetail();
  },
  closeCreateDialog() {
    this.createDialog = false;
    this.newArchiveName = '';
    this.newArchiveCoursesCount = 0;
    this.newArchiveBatchType = 'all';
  },
  closeArchiveAllDialog() {
    this.archiveAllDialog = false;
    this.archiveAllName = '';
    this.archiveAllBatchType = 'all';
  },
  closeAddStudentDialog() {
    this.addStudentDialog = false;
    this.manualStudentName = '';
  },
  deleteArchive(archive) {
    if (!archive || this.deletingArchiveId) return;

    this.pendingDeleteArchive = archive;
    this.deleteArchiveDialog = true;
  },
  closeDeleteArchiveDialog() {
    if (this.deletingArchiveId) return;

    this.deleteArchiveDialog = false;
    this.pendingDeleteArchive = null;
  },
};
