<template>
  <AppDialog
    :value="open"
    :persistent="true"
    max-width="620"
    @input="!$event && $emit('cancel')"
  >
    <DialogShell :title="editing ? 'تعديل الحساب الإشرافي' : 'إضافة حساب إشرافي'">
      <div class="account-editor__fields">
        <AppSelect
          id="dashboard-account-role"
          :value="form.role"
          :items="roles"
          item-text="label"
          item-value="value"
          label="نوع المسؤول"
          :disabled="submitting || protectedAccount"
          hide-details
          @input="change('role', $event)"
        />
        <AppInput
          id="dashboard-account-name"
          :value="form.name"
          label="الاسم"
          hint="6 أحرف على الأقل."
          :maxlength="255"
          :error="fieldError('name')"
          :disabled="submitting"
          autocomplete="name"
          @input="change('name', $event)"
          @blur="touched.name = true"
        />
        <AppInput
          id="dashboard-account-login-code"
          :value="form.loginCode"
          label="رقم الدخول"
          :maxlength="255"
          :error="fieldError('loginCode')"
          :disabled="submitting"
          autocomplete="off"
          dir="auto"
          @input="change('loginCode', $event)"
          @blur="touched.loginCode = true"
        />
        <AppPasswordField
          id="dashboard-account-password"
          :value="form.password"
          :label="editing ? 'كلمة المرور الجديدة' : 'كلمة المرور'"
          :hint="editing ? 'اتركها فارغة للاحتفاظ بالحالية. 8 أحرف على الأقل.' : passwordHint"
          persistent-hint
          :maxlength="255"
          :error-messages="fieldError('password')"
          :disabled="submitting"
          autocomplete="new-password"
          @input="change('password', $event)"
          @blur="touched.password = true"
        />
      </div>
      <p
        v-if="form.role === 'admin'"
        class="permissions-admin__scope"
      >
        مسؤول الإدارة يملك جميع صلاحيات إدارته، بما فيها إدارة الحسابات الإشرافية.
      </p>
      <p
        v-if="error"
        role="alert"
        class="permissions-admin__error"
      >
        {{ error }}
      </p>
      <template #actions>
        <AppButton
          variant="secondary"
          :disabled="submitting"
          @click="$emit('cancel')"
        >
          إلغاء
        </AppButton>
        <AppButton
          variant="primary"
          :loading="submitting"
          :disabled="submitting || !valid || !changed"
          @click="$emit('save')"
        >
          {{ editing ? 'حفظ' : 'إضافة' }}
        </AppButton>
      </template>
    </DialogShell>
  </AppDialog>
</template>
<script>
import { AppButton, AppDialog, AppInput, AppPasswordField, AppSelect, DialogShell } from '../ui';
import { ACCOUNT_PASSWORD_HINT, accountEditorErrors } from '../../features/dashboardAccounts/accountEditorModel.mjs';
export default {
  name: 'DashboardAccountEditor', components: { AppButton, AppDialog, AppInput, AppPasswordField, AppSelect, DialogShell },
  props: { open: Boolean, editing: Boolean, protectedAccount: Boolean, form: { type: Object, required: true }, roles: { type: Array, required: true }, submitting: Boolean, valid: Boolean, changed: Boolean, errors: { type: Object, default: () => ({}) }, error: { type: String, default: '' } },
  emits: ['change', 'cancel', 'save'], data: () => ({ touched: {}, passwordHint: ACCOUNT_PASSWORD_HINT }),
  watch: { open(value) { if (value) this.touched = {}; } },
  methods: { change(key, value) { this.$emit('change', { key, value }); }, fieldError(key) { return this.errors[key] || (this.touched[key] ? accountEditorErrors(this.form, this.editing)[key] : '') || ''; } },
};
</script>
<style scoped>
.account-editor__fields { display: grid; gap: 16px; margin-bottom: 16px; }
</style>
