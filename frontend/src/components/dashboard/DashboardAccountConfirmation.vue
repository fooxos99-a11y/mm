<template>
  <AppDialog
    :value="Boolean(action)"
    :persistent="true"
    max-width="480"
  >
    <DialogShell :title="title">
      <p>{{ message }}</p>
      <p
        v-if="error"
        class="permissions-admin__error"
        role="alert"
      >
        {{ error }}
      </p>
      <template #actions>
        <AppButton
          variant="secondary"
          :disabled="busy"
          @click="$emit('cancel')"
        >
          {{ action === 'discard' ? 'متابعة التعديل' : 'إلغاء' }}
        </AppButton>
        <AppButton
          variant="danger"
          :loading="busy"
          :disabled="busy"
          @click="$emit('confirm')"
        >
          {{ label }}
        </AppButton>
      </template>
    </DialogShell>
  </AppDialog>
</template>
<script>
import { AppButton, AppDialog, DialogShell } from '../ui';
export default {
  name: 'DashboardAccountConfirmation', components: { AppButton, AppDialog, DialogShell },
  props: { action: { type: String, default: '' }, account: { type: Object, default: null }, busy: Boolean, error: { type: String, default: '' } }, emits: ['cancel', 'confirm'],
  computed: {
    label() { return ({ delete: 'حذف الحساب', discard: 'إلغاء التعديلات' })[this.action] || ''; },
    title() { return this.action === 'discard' ? 'إلغاء التعديلات؟' : `${this.label}؟`; },
    message() { if (this.action === 'discard') return 'ستفقد بيانات الحساب التي لم تحفظها.';
      if (this.action === 'delete') return `سيُحذف حساب «${this.account?.name}» نهائيًا وتُنهى جلساته. لا يمكن التراجع عن الحذف.`;
      return ''; },
  },
};
</script>
