<template>
  <AppDialog
    :value="open"
    max-width="480"
    :persistent="saving"
    @input="!saving && $emit('close')"
  >
    <div
      class="app-dialog"
      dir="rtl"
    >
      <AppDialogHeader
        title="إعادة المحاولة"
        :closable="!saving"
        @close="$emit('close')"
      />
      <AppDialogBody>
        <p>ستُحذف إجابة {{ studentName }} السابقة ونتيجتها، وتتاح له الإجابة مجددًا على نفس التقييم.</p>
      </AppDialogBody>
      <AppActionBar class="app-dialog-footer">
        <AppButton
          variant="secondary"
          :disabled="saving"
          @click="$emit('close')"
        >
          إلغاء
        </AppButton>
        <AppButton
          variant="danger"
          :loading="saving"
          :disabled="saving"
          @click="$emit('confirm')"
        >
          إعادة المحاولة
        </AppButton>
      </AppActionBar>
    </div>
  </AppDialog>
</template>

<script>
import { AppActionBar, AppButton, AppDialog, AppDialogBody, AppDialogHeader } from '../ui';

export default {
  components: { AppActionBar, AppButton, AppDialog, AppDialogBody, AppDialogHeader },
  props: { open: Boolean, saving: Boolean, studentName: { type: String, default: '' } },
  emits: ['close', 'confirm'],
};
</script>
