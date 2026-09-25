import managementMethods from './peopleManagementMethods';
import studentMethods from './peopleStudentMethods';
import { fetchPersonDetail } from '../../services/peopleDirectoryApi';

export default {
  async loadPerson(type, id) {
    const person = await fetchPersonDetail(type, id);
    this.personRecords[type][id] = person;
    return person;
  },
  async withPersonData(work) {
    if (this.dialogDataLoading) return;
    this.dialogDataLoading = true;
    this.dialogDataError = '';
    try {
      return await work();
    } catch (error) {
      this.dialogDataError = error?.response?.data?.message || 'تعذر تحميل بيانات النافذة. حاول مرة أخرى.';
      this.showTimedToast('error', this.dialogDataError);
    } finally {
      this.dialogDataLoading = false;
    }
  },
  openCreateDialog() { managementMethods.openCreateDialog.call(this); },
  openManageDialog() { managementMethods.openManageDialog.call(this); },
  openEditDialog() {
    if (this.selectedStudentId) return this.openEditDialogFor('student', this.selectedStudentId, false);
    managementMethods.openEditDialog.call(this);
  },
  openEditDialogFor(type, id, direct = true) {
    if ((type === 'student' && !this.canEditStudent) || (type === 'reciter' && !this.canEditReciter)) return;
    return this.withPersonData(async () => {
      await this.loadPerson(type, id);
      managementMethods.openEditDialogFor.call(this, type, id, direct);
    });
  },
  openReciterAssignmentDialog(student) {
    if (!this.canAssignReciter) return;
    return this.withPersonData(async () => {
      const person = await this.loadPerson('student', student.id);
      if (person.reciterId) await this.loadPerson('reciter', person.reciterId);
      studentMethods.openReciterAssignmentDialog.call(this, person);
      this.reciterDialogReciterId = person.reciterId || '';
    });
  },
  handleMetricClick(student, key) {
    if (key !== 'parts') return;
    return this.withPersonData(async () => {
      const person = await this.loadPerson('student', student.id);
      studentMethods.handleMetricClick.call(this, person, key);
    });
  },
  async handleEditingTargetChange(id) {
    const type = this.dialogEntityType;
    const branch = this.dialogBranchId;
    this.editingTargetId = '';
    return this.withPersonData(async () => {
      await this.loadPerson(type, id);
      if (type !== this.dialogEntityType || branch !== this.dialogBranchId || !this.dialogOpen) return;
      managementMethods.handleEditingTargetChange.call(this, id);
    });
  },
  async selectManageTarget(id) {
    const type = this.manageEntityType;
    const branch = this.manageBranchId;
    this.manageTargetId = '';
    return this.withPersonData(async () => {
      await this.loadPerson(type, id);
      if (type === this.manageEntityType && branch === this.manageBranchId && this.manageDialogOpen) this.manageTargetId = id;
    });
  },
  async selectReciterTarget(id) {
    return this.withPersonData(async () => {
      if (id) await this.loadPerson('reciter', id);
      this.reciterDialogReciterId = id;
    });
  },
};
