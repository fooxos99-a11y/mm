<template>
  <AppDialog
    :model-value="discardOpen"
    max-width="480"
    @update:model-value="!$event && $emit('resolve-discard', false)"
  >
    <div class="app-dialog">
      <AppDialogHeader title="تغييرات غير محفوظة" />
      <AppDialogBody><p>ستفقد التعديلات إذا غادرت دون حفظها.</p></AppDialogBody>
      <AppDialogFooter>
        <AppButton
          variant="primary"
          @click="$emit('resolve-discard', false)"
        >
          متابعة التحرير
        </AppButton>
        <AppButton
          variant="danger"
          @click="$emit('resolve-discard', true)"
        >
          مغادرة دون حفظ
        </AppButton>
      </AppDialogFooter>
    </div>
  </AppDialog>
</template>
<script>
import { AppButton, AppDialog, AppDialogBody, AppDialogFooter, AppDialogHeader } from '../ui';
export default {
  name: 'AssessmentEditorDialogs',
  components: { AppButton, AppDialog, AppDialogBody, AppDialogFooter, AppDialogHeader },
  props: { discardOpen: Boolean },
  emits: ['resolve-discard'],
};
</script>
