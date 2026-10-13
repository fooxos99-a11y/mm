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
    if (this.reciterDialogSaving || this.dialogDataLoading) return;
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
    const previousId = student?.reciterId || '';
    const nextId = this.reciterDialogReciterId;
    if (!student || this.reciterDialogSaving || !this.canAssignReciter) return;
    if (previousId === nextId) return;
    if (!nextId && !this.canEditReciter) {
      this.reciterDialogReciterId = previousId;
      return;
    }
    this.reciterDialogSaving = true;
    this.dialogDataError = '';
    try {
      if (nextId) {
        await transferStudentToReciter(student.id, nextId);
      } else {
        // Reload the complete assignment before unlinking so other teachers stay linked.
        const current = await this.loadPerson('reciter', previousId);
        await this.saveReciter({
          currentLoginCode: current.loginCode, name: current.name,
          loginCode: current.loginCode, branchId: current.branchId,
          linkedStudentIds: (current.studentIds || []).filter((id) => id !== student.id),
          backgroundRefresh: true,
        });
      }
      this.personRecords.student[student.id] = { ...student, reciterId: nextId || null };
      for (const id of [previousId, nextId].filter(Boolean)) {
        const reciter = this.personRecords.reciter[id];
        if (!reciter) continue;
        const others = (reciter.studentIds || []).filter((value) => value !== student.id);
        this.personRecords.reciter[id] = { ...reciter, studentIds: id === nextId ? [...others, student.id] : others };
      }
      this.showTimedToast('success', nextId ? 'تم تحديث الربط' : 'تم فك الربط');
    } catch (error) {
      this.reciterDialogReciterId = previousId;
      this.dialogDataError = error?.response?.data?.message || 'تعذر تحديث الربط. حاول مرة أخرى.';
      return;
    } finally {
      this.reciterDialogSaving = false;
    }
    if (nextId) await this.refreshDashboardSnapshot({ background: true });
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
