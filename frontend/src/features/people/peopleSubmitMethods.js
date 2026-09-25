import { passwordMeetsPolicy, PASSWORD_REQUIREMENTS_TEXT } from '../../utils/passwordPolicy.mjs';

export default {
    validatePersonForm() {
      const name = String(this.activeName || '').trim();
      const loginCode = String(this.activeLoginCode || '').trim();
      const password = String(this.activePassword || '');
      const confirmation = String(this.activePasswordConfirmation || '');
      const errors = [];

      if (!name) errors.push(this.dialogEntityType === 'student' ? 'أدخل اسم المعلم/ة.' : 'أدخل اسم المقرئ.');
      if (!loginCode) errors.push('أدخل رقم الدخول.');
      else if (loginCode.length < 4) errors.push('يجب ألا يقل رقم الدخول عن 4 أحرف أو أرقام.');
      else if (!/^[\p{L}\p{N}]+$/u.test(loginCode)) errors.push('رقم الدخول يقبل الحروف والأرقام فقط.');
      if (password && password !== confirmation) errors.push('تأكيد كلمة المرور غير مطابق.');
      if (password && !passwordMeetsPolicy(password)) errors.push(PASSWORD_REQUIREMENTS_TEXT);

      return errors;
    },
    resolveDialogErrors(error) {
      const validationErrors = error?.response?.data?.errors;
      if (validationErrors && typeof validationErrors === 'object') {
        const messages = Object.values(validationErrors).flat().filter(Boolean);
        if (messages.length) return [...new Set(messages.map(String))];
      }
      const message = error?.response?.data?.message;
      return [message && !/^The\s/i.test(message) ? message : 'تعذر حفظ البيانات. تحقق من الحقول وحاول مرة أخرى.'];
    },
    async submitDialog() {
      this.dialogErrors = this.validatePersonForm();
      if (this.dialogErrors.length || this.dialogSubmitting) return;
      this.dialogSubmitting = true;
      try {
        if (this.dialogEntityType === 'student') {
          if (this.isEditing) {
            if (!this.canEditStudent) {
              return;
            }

            if (!this.editingStudentRecord) {
              this.showTimedToast('error', 'اختر المعلم أولًا');
              return;
            }

            await this.updateStudent({
              studentId: this.editingStudentRecord.id,
              updates: {
                name: this.studentForm.name,
                loginCode: this.studentForm.loginId,
                branchId: this.studentForm.branchId,
                note: this.studentForm.note,
                password: this.studentForm.password || undefined,
                passwordConfirmation: this.studentForm.password ? this.studentForm.passwordConfirmation : undefined,
              },
            });
            this.selectedStudentId = this.editingStudentRecord.id;
            this.showTimedToast('success', 'تم تحديث بيانات المعلم');
          } else {
            if (!this.canAddStudent) {
              return;
            }

            await this.addStudent({
              name: this.studentForm.name,
              loginId: this.studentForm.loginId,
              password: this.studentForm.password,
              passwordConfirmation: this.studentForm.passwordConfirmation,
              branchId: this.studentForm.branchId,
              note: this.studentForm.note,
            });
            this.showTimedToast('success', 'تمت إضافة المعلم');
          }

        } else {
          if ((this.isEditing && !this.canEditReciter) || (!this.isEditing && !this.canAddReciter)) {
            return;
          }

          if (this.isEditing && !this.editingReciterRecord) {
            this.showTimedToast('error', 'اختر المقرئ أولًا');
            return;
          }

          await this.saveReciter({
            currentLoginCode: this.isEditing ? this.editingReciterRecord.loginCode : null,
            name: this.reciterForm.name,
            loginCode: this.reciterForm.loginCode,
            password: this.reciterForm.password || undefined,
            passwordConfirmation: this.reciterForm.password ? this.reciterForm.passwordConfirmation : undefined,
            branchId: this.reciterForm.branchId,
            linkedStudentIds: this.reciterForm.studentIds,
          });
          this.showTimedToast('success', this.isEditing ? 'تم تحديث المقرئ' : 'تمت إضافة المقرئ');
        }

        this.dialogOpen = false;
        this.resetForms();
      } catch (error) {
        this.dialogErrors = this.resolveDialogErrors(error);
      } finally {
        this.dialogSubmitting = false;
      }
    },
};
