import { BULK_LOGIN_HEADER_KEYS, BULK_NAME_HEADER_KEYS, BULK_PASSWORD_HEADER_KEYS } from './peopleModel.mjs';
import { createStudent as createStudentRequest, saveReciter as saveReciterRequest } from '../../services/api';

export default {
    openBulkFilePicker() {
      if (this.bulkImporting || this.dialogEntityType !== 'student' || !this.canAddStudent) {
        return;
      }

      this.bulkFilePickerOpen = true;
      window.removeEventListener('focus', this.handleBulkFilePickerWindowFocus);
      window.addEventListener('focus', this.handleBulkFilePickerWindowFocus, { once: true });
      this.$refs.peopleEditorDialog?.openFileInput();
    },
    handleBulkFilePickerWindowFocus() {
      if (this.bulkFilePickerResetTimer) {
        window.clearTimeout(this.bulkFilePickerResetTimer);
      }

      this.bulkFilePickerResetTimer = window.setTimeout(() => {
        this.bulkFilePickerOpen = false;
        this.bulkFilePickerResetTimer = null;
      }, 150);
    },
    clearBulkFileInput() {
      this.$refs.peopleEditorDialog?.clearFileInput();
    },
    normalizeBulkCell(value) {
      if (value && typeof value === 'object') {
        if (Array.isArray(value.richText)) {
          return value.richText.map((part) => part?.text || '').join('').trim();
        }

        if (value.text !== undefined) {
          return String(value.text || '').trim();
        }

        if (value.result !== undefined) {
          return String(value.result || '').trim();
        }
      }

      return String(value == null ? '' : value).trim();
    },
    findBulkHeaderIndex(headerRow, candidates) {
      return headerRow.findIndex((cell) => candidates.includes(cell.toLowerCase()));
    },
    looksLikeLoginCode(value) {
      const normalized = this.normalizeBulkCell(value);

      if (!normalized) {
        return false;
      }

      return /^[A-Za-z0-9_-]{4,}$/.test(normalized) && /\d/.test(normalized);
    },
    parseCsvRows(text) {
      const rows = [];
      let row = [];
      let cell = '';
      let inQuotes = false;

      for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        const nextChar = text[index + 1];

        if (char === '"' && inQuotes && nextChar === '"') {
          cell += '"';
          index += 1;
          continue;
        }

        if (char === '"') {
          inQuotes = !inQuotes;
          continue;
        }

        if (char === ',' && !inQuotes) {
          row.push(cell);
          cell = '';
          continue;
        }

        if ((char === '\n' || char === '\r') && !inQuotes) {
          if (char === '\r' && nextChar === '\n') {
            index += 1;
          }
          row.push(cell);
          rows.push(row);
          row = [];
          cell = '';
          continue;
        }

        cell += char;
      }

      row.push(cell);
      rows.push(row);

      return rows;
    },
    async readBulkRows(file) {
      const extension = (file.name || '').split('.').pop()?.toLowerCase();

      if (extension === 'csv') {
        return this.parseCsvRows(await file.text());
      }

      const excelModule = await import(/* webpackChunkName: "exceljs" */ 'exceljs');
      const ExcelJS = excelModule.default || excelModule;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const worksheet = workbook.worksheets[0];

      if (!worksheet) {
        return [];
      }

      const rows = [];
      worksheet.eachRow({ includeEmpty: false }, (row) => {
        rows.push(row.values.slice(1));
      });

      return rows;
    },
    async parseBulkImportFile(file) {
      const rawRows = await this.readBulkRows(file);

      const rows = rawRows
        .map((row) => Array.isArray(row) ? row.map((cell) => this.normalizeBulkCell(cell)) : [])
        .filter((row) => row.some((cell) => cell));

      if (!rows.length) {
        return [];
      }

      let dataRows = rows;
      let nameIndex = 0;
      let loginIndex = 1;
      let passwordIndex = 2;

      const detectedNameIndex = this.findBulkHeaderIndex(rows[0], BULK_NAME_HEADER_KEYS);
      const detectedLoginIndex = this.findBulkHeaderIndex(rows[0], BULK_LOGIN_HEADER_KEYS);
      const detectedPasswordIndex = this.findBulkHeaderIndex(rows[0], BULK_PASSWORD_HEADER_KEYS);

      if (detectedNameIndex !== -1 || detectedLoginIndex !== -1 || detectedPasswordIndex !== -1) {
        dataRows = rows.slice(1);
        if (detectedNameIndex !== -1) {
          nameIndex = detectedNameIndex;
        }
        if (detectedLoginIndex !== -1) {
          loginIndex = detectedLoginIndex;
        }
        if (detectedPasswordIndex !== -1) {
          passwordIndex = detectedPasswordIndex;
        }
      }

      return dataRows
        .map((row) => {
          const compactValues = row.filter((cell) => cell);
          let name = this.normalizeBulkCell(row[nameIndex] || compactValues[0] || '');
          let loginCode = this.normalizeBulkCell(row[loginIndex] || compactValues[1] || '');
          const password = this.normalizeBulkCell(row[passwordIndex] || compactValues[2] || '');

          if (this.looksLikeLoginCode(name) && loginCode && !this.looksLikeLoginCode(loginCode)) {
            [name, loginCode] = [loginCode, name];
          }

          return { name, loginCode, password };
        })
        .filter((entry) => entry.name);
    },
    async handleBulkFileChange(event) {
      if (this.dialogEntityType !== 'student' || !this.canAddStudent) {
        return;
      }

      const file = event?.target?.files?.[0];

      if (!file) {
        return;
      }

      this.bulkImporting = true;

      try {
        const entries = await this.parseBulkImportFile(file);

        if (!entries.length) {
          this.showTimedToast('error', 'لم يتم العثور على أسماء صالحة داخل الملف.');
          return;
        }

        const branchId = this.dialogBranchId || this.activeBranchId || 'male';
        const failures = [];
        let successCount = 0;

        for (const entry of entries) {
          try {
            if (this.dialogEntityType === 'student') {
              await createStudentRequest({
                name: entry.name,
                loginId: entry.loginCode,
                password: entry.password,
                passwordConfirmation: entry.password,
                branchId,
                note: '',
              });
            } else {
              await saveReciterRequest({
                currentLoginCode: null,
                name: entry.name,
                loginCode: entry.loginCode,
                password: entry.password,
                passwordConfirmation: entry.password,
                branchId,
                linkedStudentIds: [],
              });
            }

            successCount += 1;
          } catch (error) {
            failures.push({
              name: entry.name,
              message: error?.response?.data?.message || 'تعذر الاستيراد',
            });
          }
        }

        if (successCount > 0) {
          await this.refreshDashboardSnapshot();
        }

        if (successCount > 0 && failures.length === 0) {
          this.showTimedToast('success', `تمت إضافة ${successCount} ${this.dialogEntityType === 'student' ? 'معلم' : 'مقرئ'} من الملف.`);
          return;
        }

        if (successCount > 0 && failures.length > 0) {
          const sampleFailures = failures.slice(0, 3).map((item) => `${item.name}: ${item.message}`).join(' | ');
          this.showTimedToast('info', `تمت إضافة ${successCount} عنصر، وتعذر استيراد ${failures.length}. ${sampleFailures}`, { timeout: 6500 });
          return;
        }

        this.showTimedToast('error', failures[0]?.message || 'تعذر استيراد الملف.');
      } catch (error) {
        this.showTimedToast('error', 'تعذر قراءة ملف الإكسل. تأكد من أن أول ورقة تحتوي على الأسماء والأرقام.');
      } finally {
        this.bulkImporting = false;
        this.bulkFilePickerOpen = false;
        this.clearBulkFileInput();
      }
    },
};
