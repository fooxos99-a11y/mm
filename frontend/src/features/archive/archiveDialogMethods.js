import { emptyArchiveCounts } from './archiveCounts.mjs';

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
    this.newArchiveCounts = emptyArchiveCounts();
    this.createArchiveErrors = {};
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
    if (archive?.can_manage !== true || this.deletingArchiveId) return;

    this.pendingDeleteArchive = archive;
    this.deleteArchiveDialog = true;
  },
  closeDeleteArchiveDialog() {
    if (this.deletingArchiveId) return;

    this.deleteArchiveDialog = false;
    this.pendingDeleteArchive = null;
  },
  updateArchiveName(value) {
    this.newArchiveName = value;
    this.clearCreateArchiveError('name');
  },
  updateArchiveCount(key, value) {
    this.newArchiveCounts = { ...this.newArchiveCounts, [key]: value };
    this.clearCreateArchiveError(key);
  },
  updateArchiveBatchType(value) {
    this.newArchiveBatchType = value;
    this.clearCreateArchiveError('batch_type');
  },
  clearCreateArchiveError(key) {
    const errors = { ...this.createArchiveErrors };
    delete errors[key];
    this.createArchiveErrors = errors;
  },
};
