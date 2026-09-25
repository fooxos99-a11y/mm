import { toggleStudentPart, transferStudentToReciter } from '../../services/api';

export default {
  async submitManageDeleteWithSuccessFallback() {
    if (!this.managedTargetRecord || this.manageDialogSubmitting) return;
    if ((this.manageEntityType === 'student' && !this.canDeleteStudent)
      || (this.manageEntityType === 'reciter' && !this.canDeleteReciter)) return;

    const targetId = this.managedTargetRecord.id;
    const targetLoginCode = this.managedTargetRecord.loginCode;
    this.manageDialogSubmitting = true;
    try {
      if (this.manageEntityType === 'student') {
        await this.deleteStudent(targetId);
        if (this.selectedStudentId === targetId) this.selectedStudentId = '';
        this.showTimedToast('success', 'تم حذف المعلم بنجاح');
      } else {
        await this.deleteReciter(targetLoginCode);
        this.showTimedToast('success', 'تم حذف المقرئ بنجاح');
      }
      this.closeManageDialog();
    } catch (error) {
      this.showTimedToast('error', error?.response?.data?.message || 'تعذر حذف العنصر');
      this.manageDialogSubmitting = false;
    }
  },
  openDeletePersonDialog(person) {
    if (!person || !this.canDeleteVisiblePeople) return;
    this.deleteTarget = person;
    this.deleteTargetIsReciter = this.isReciterDirectoryMode;
    this.deleteDialogSubmitting = false;
    this.deleteDialogOpen = true;
  },
  closeDeleteDialog() {
    if (!this.deleteDialogSubmitting) this.resetDeleteDialog();
  },
  resetDeleteDialog() {
    this.deleteDialogOpen = false;
    this.deleteDialogSubmitting = false;
    this.deleteTarget = null;
    this.deleteTargetIsReciter = false;
  },
  async confirmDeletePerson() {
    if (!this.deleteTarget || this.deleteDialogSubmitting) return;
    const person = this.deleteTarget;
    const isReciter = this.deleteTargetIsReciter;
    if ((isReciter && !this.canDeleteReciter) || (!isReciter && !this.canDeleteStudent)) return;
    this.deleteDialogSubmitting = true;
    try {
      if (isReciter) {
        await this.deleteReciter(person.loginCode);
        this.showTimedToast('success', 'تم حذف المقرئ');
        this.resetDeleteDialog();
        return;
      }
      await this.deleteStudent(person.id);
      if (this.selectedStudentId === person.id) this.selectedStudentId = '';
      this.showTimedToast('success', 'تم حذف المعلم');
      this.resetDeleteDialog();
    } catch (error) {
      this.showTimedToast('error', error?.response?.data?.message || 'تعذر حذف العنصر');
      this.deleteDialogSubmitting = false;
    }
  },
  openReciterAssignmentDialog(student) {
    if (!student || !this.canAssignReciter) return;
    const assignedReciter = this.reciters.find((reciter) => (reciter.studentIds || []).includes(student.id));
    this.selectedStudentId = student.id;
    this.reciterDialogStudentId = student.id;
    this.reciterDialogReciterId = assignedReciter?.id || '';
    this.reciterDialogOpen = true;
  },
  closeReciterDialog() {
    this.reciterDialogOpen = false;
    this.reciterDialogStudentId = '';
    this.reciterDialogReciterId = '';
    this.reciterDialogSaving = false;
  },
  handleMetricClick(student, metricKey) {
    if (metricKey !== 'parts') return;
    this.selectedStudentId = student.id;
    this.partsDialogStudentId = student.id;
    this.partsDialogParts = [...(student.completedParts || [])];
    this.partsDialogOpen = true;
  },
  closePartsDialog() {
    this.partsDialogOpen = false;
    this.partsDialogStudentId = '';
    this.partsDialogSavingKey = '';
    this.partsDialogParts = [];
  },
  isCompletedDialogPart(part) {
    return this.partsDialogParts.includes(part);
  },
  async submitReciterAssignment() {
    const student = this.reciterDialogStudent;
    const currentReciter = this.assignedReciterRecord;
    const nextReciter = this.reciters.find((reciter) => reciter.id === this.reciterDialogReciterId) || null;
    if (!student || this.reciterDialogSaving || !this.canAssignReciter) return;
    if ((currentReciter?.id || '') === (nextReciter?.id || '')) {
      this.showTimedToast('info', 'لم يتم تغيير المقرئ.');
      this.closeReciterDialog();
      return;
    }

    this.reciterDialogSaving = true;
    try {
      if (nextReciter) {
        await transferStudentToReciter(student.id, nextReciter.id);
      } else if (currentReciter && this.canEditReciter) {
        await this.saveReciter({
          currentLoginCode: currentReciter.loginCode,
          name: currentReciter.name,
          loginCode: currentReciter.loginCode,
          branchId: currentReciter.branchId,
          linkedStudentIds: (currentReciter.studentIds || []).filter((studentId) => studentId !== student.id),
        });
      } else {
        this.showTimedToast('error', 'لا توجد صلاحية لفك الربط بدون اختيار مقرئ بديل');
        this.reciterDialogSaving = false;
        return;
      }
      this.showTimedToast('success', nextReciter ? 'تم تحديث ربط المقرئ' : 'تم فك ربط المقرئ');
      this.closeReciterDialog();
      await this.refreshDashboardSnapshot();
    } catch (error) {
      this.showTimedToast('error', error?.response?.data?.message || 'تعذر تحديث ربط المقرئ');
      this.reciterDialogSaving = false;
    }
  },
  async toggleDialogPart(partNumber) {
    const student = this.partsDialogStudent;
    if (!student || this.partsDialogSavingKey || !this.canManageStudentParts) return;
    const isCompleted = this.partsDialogParts.includes(partNumber);
    const previousParts = [...this.partsDialogParts];
    this.partsDialogSavingKey = `${student.id}:${partNumber}`;
    this.partsDialogParts = isCompleted
      ? this.partsDialogParts.filter((part) => part !== partNumber)
      : [...this.partsDialogParts, partNumber].sort((left, right) => left - right);
    try {
      await toggleStudentPart({
        studentId: student.id,
        partNumber,
        reciterId: student.reciterId || null,
        shouldMarkComplete: !isCompleted,
      });
      this.personRecords.student[student.id] = { ...student, completedParts: [...this.partsDialogParts] };
      await this.refreshDashboardSnapshot();
    } catch (error) {
      this.partsDialogParts = previousParts;
      this.showTimedToast('error', error?.response?.data?.message || 'تعذر حفظ الجزء المقروء');
    } finally {
      this.partsDialogSavingKey = '';
    }
  },
};
