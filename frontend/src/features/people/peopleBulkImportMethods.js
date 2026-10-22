import { parseImportCsv, prepareStudentImport } from './peopleImportModel.mjs';
import { previewStudentImport, commitStudentImport } from '../../services/studentImportApi';

export default {
  openBulkFilePicker() {
    if (this.bulkImporting || this.dialogEntityType !== 'student' || !this.canAddStudent) return;
    this.bulkFilePickerOpen = true;
    window.removeEventListener('focus', this.handleBulkFilePickerWindowFocus);
    window.addEventListener('focus', this.handleBulkFilePickerWindowFocus, { once: true });
    this.$refs.peopleEditorDialog?.openFileInput();
  },
  handleBulkFilePickerWindowFocus() {
    if (this.bulkFilePickerResetTimer) window.clearTimeout(this.bulkFilePickerResetTimer);
    this.bulkFilePickerResetTimer = window.setTimeout(() => { this.bulkFilePickerOpen = false; }, 150);
  },
  clearBulkFileInput() { this.$refs.peopleEditorDialog?.clearFileInput(); },
  parseCsvRows(text) { return parseImportCsv(text); },
  async readBulkRows(file) {
    if ((file.name || '').toLowerCase().endsWith('.csv')) return parseImportCsv(await file.text());
    const module = await import(/* webpackChunkName: "exceljs" */ 'exceljs');
    const ExcelJS = module.default || module;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const worksheet = workbook.worksheets[0];
    if (!worksheet) return [];
    const rows = [];
    // Hidden rows are registrations too; never silently exclude them.
    worksheet.eachRow({ includeEmpty: false }, (row, sourceRow) => {
      rows.push({ cells: row.values.slice(1), sourceRow });
    });
    return rows;
  },
  async parseBulkImportFile(file) { return prepareStudentImport(await this.readBulkRows(file)); },
  async handleBulkFileChange(event) {
    if (this.dialogEntityType !== 'student' || !this.canAddStudent || this.bulkImporting) return;
    const file = event?.target?.files?.[0];
    if (!file) return;
    this.bulkImporting = true;
    try {
      if (file.size > 8 * 1024 * 1024) throw new Error('حجم الملف يتجاوز 8 ميغابايت.');
      const hash = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
      const sourceHash = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
      this.bulkImportPayload = {
        sourceHash, branchId: this.dialogBranchId || this.activeBranchId || 'male',
        entries: await this.parseBulkImportFile(file),
      };
      this.bulkImportPreview = await previewStudentImport(this.bulkImportPayload);
      this.bulkImportError = '';
    } catch (error) {
      this.bulkImportPayload = null;
      this.showTimedToast('error', error?.response?.data?.message || error.message || 'تعذّرت قراءة الملف.');
    } finally {
      this.bulkImporting = false; this.bulkFilePickerOpen = false; this.clearBulkFileInput();
    }
  },
  closeBulkImportPreview() {
    if (this.bulkImporting) return;
    this.bulkImportPreview = null; this.bulkImportPayload = null; this.bulkImportError = '';
  },
  async confirmBulkImport() {
    if (this.bulkImporting || !this.bulkImportPreview || !this.bulkImportPayload) return;
    this.bulkImporting = true; this.bulkImportError = '';
    try {
      const result = await commitStudentImport({ ...this.bulkImportPayload, confirmation: this.bulkImportPreview.confirmation });
      this.bulkImportPreview = null; this.bulkImportPayload = null;
      await this.refreshDashboardSnapshot();
      await this.loadPeopleDirectory();
      this.showTimedToast('success', result.alreadyImported ? 'الحسابات مضافة سابقًا.' : `أُضيف ${result.imported} حسابًا.`);
    } catch (error) {
      this.bulkImportError = error?.response?.data?.message || 'تعذّر تأكيد الإضافة. راجع المعاينة وحاول مرة أخرى.';
    } finally { this.bulkImporting = false; }
  },
};
