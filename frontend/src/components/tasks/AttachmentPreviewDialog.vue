<template>
  <AppDialog
    :value="open"
    max-width="920"
    @input="$emit('update:open', $event)"
    @close="$emit('close')"
  >
    <div class="app-dialog">
      <AppDialogHeader
        title="معاينة المرفق"
        closable
        initial-focus
        @close="$emit('close')"
      />
      <AppDialogBody v-if="attachment">
        <AttachmentContent
          :kind="kind"
          :attachment="{ ...attachment, fileDataUrl: source || attachment.fileDataUrl }"
        />
      </AppDialogBody>
    </div>
  </AppDialog>
</template>

<script>
import { AppDialog, AppDialogBody, AppDialogHeader } from '../ui';
import AttachmentContent from './AttachmentContent.vue';

export default {
  name: 'AttachmentPreviewDialog',
  components: { AppDialog, AppDialogBody, AppDialogHeader, AttachmentContent },
  props: {
    open: { type: Boolean, default: false },
    attachment: { type: Object, default: null },
    kind: { type: String, default: 'other' },
    source: { type: String, default: '' },
  },
  emits: ['close', 'update:open'],
};
</script>
