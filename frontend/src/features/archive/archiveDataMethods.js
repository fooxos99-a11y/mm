import {
  addArchivedStudent,
  archiveCurrentContent,
  createArchive as persistArchive,
  getArchive,
  getArchivedStudent,
  listArchives,
  removeArchive,
  searchArchivedStudents as searchStudents,
} from '../../services/archiveService';

export default {
  notifySuccess(message) {
    if (this.$toast?.success) this.$toast.success(message);
  },
  notifyError(message) {
    if (this.$toast?.error) this.$toast.error(message);
  },
  async fetchArchives() {
    try {
      const response = await listArchives();
      this.archives = response.data;
    } catch {
      this.notifyError('تعذر تحميل الأرشيفات.');
    }
  },
  async fetchArchiveData() {
    if (!this.selectedArchiveId) {
      this.archiveData = null;
      this.clearArchivedStudentDetail();
      return;
    }

    this.loading = true;
    this.clearArchivedStudentDetail();
    try {
      const response = await getArchive(this.selectedArchiveId);
      this.archiveData = response.data;
    } catch {
      this.notifyError('تعذر تحميل بيانات الأرشيف.');
    } finally {
      this.loading = false;
    }
  },
  async confirmDeleteArchive() {
    const archive = this.pendingDeleteArchive;
    if (!archive || this.deletingArchiveId) return;

    this.deletingArchiveId = archive.id;
    try {
      await removeArchive(archive.id);
      this.selectedArchiveId = null;
      this.archiveData = null;
      this.clearArchivedStudentDetail();
      await this.fetchArchives();
      this.notifySuccess('تم حذف الأرشيف بنجاح.');
      this.deleteArchiveDialog = false;
      this.pendingDeleteArchive = null;
    } catch (error) {
      this.notifyError(error?.response?.data?.message || 'تعذر حذف الأرشيف.');
    } finally {
      this.deletingArchiveId = '';
    }
  },
  async searchArchivedStudents() {
    const term = this.studentSearchQuery.trim();
    if (!term) {
      this.searchPerformed = false;
      this.searchResults = [];
      this.clearArchivedStudentDetail();
      return;
    }

    this.searchLoading = true;
    this.searchPerformed = true;
    this.clearArchivedStudentDetail();
    try {
      const response = await searchStudents(term);
      this.searchResults = Array.isArray(response.data) ? response.data : [];
    } catch {
      this.searchResults = [];
      this.notifyError('تعذر تنفيذ البحث في الأرشيف.');
    } finally {
      this.searchLoading = false;
    }
  },
  async openArchivedStudentDetail(student) {
    const archiveId = student?.archive_id || this.selectedArchiveId;
    if (!archiveId || !student?.id || this.detailLoading) return;

    this.selectedArchivedStudentId = student.id;
    this.selectedArchivedStudentDetail = null;
    this.detailDialogOpen = true;
    this.detailLoading = true;
    try {
      const response = await getArchivedStudent(archiveId, student.id);
      this.selectedArchivedStudentDetail = response.data;
    } catch {
      this.notifyError('تعذر تحميل السجل الكامل للطالب المؤرشف.');
    } finally {
      this.detailLoading = false;
    }
  },
  async createArchive() {
    if (!this.newArchiveName.trim()) return;

    this.saving = true;
    try {
      await persistArchive({
        name: this.newArchiveName,
        courses_count: Math.max(0, Number(this.newArchiveCoursesCount) || 0),
        batch_type: this.newArchiveBatchType,
      });
      await this.fetchArchives();
      this.closeCreateDialog();
      this.notifySuccess('تم إنشاء الأرشيف بنجاح.');
    } catch (error) {
      this.notifyError(error?.response?.data?.message || 'حدث خطأ أثناء إنشاء الأرشيف.');
    } finally {
      this.saving = false;
    }
  },
  async archiveStudent() {
    if (!this.selectedArchiveId || !this.manualStudentName.trim()) return;

    this.saving = true;
    try {
      await addArchivedStudent(this.selectedArchiveId, this.manualStudentName.trim());
      this.closeAddStudentDialog();
      await this.fetchArchiveData();
      this.notifySuccess('تمت إضافة الطالب إلى الأرشيف.');
    } catch {
      this.notifyError('تعذر نقل الطالب إلى الأرشيف.');
    } finally {
      this.saving = false;
    }
  },
  async archiveAllContent() {
    if (!this.archiveAllName.trim()) return;

    this.saving = true;
    try {
      const response = await archiveCurrentContent({
        name: this.archiveAllName.trim(),
        batch_type: this.archiveAllBatchType,
      });
      const createdArchiveId = response?.data?.archive?.id || '';
      this.closeArchiveAllDialog();
      await this.fetchArchives();
      await this.$store.dispatch('loadDashboardSnapshot');

      if (createdArchiveId) this.selectedArchiveId = createdArchiveId;
      if (this.selectedArchiveId) await this.fetchArchiveData();
      this.notifySuccess('تم نقل كافة العناصر الحالية إلى الأرشيف بنجاح.');
    } catch (error) {
      this.notifyError(error?.response?.data?.message || 'فشلت عملية الأرشفة الحالية.');
    } finally {
      this.saving = false;
    }
  },
};
