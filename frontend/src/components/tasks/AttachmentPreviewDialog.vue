<template>
  <AppDialog
    :value="open"
    max-width="920"
    @input="$emit('update:open', $event)"
  >
    <v-card class="assessment-dialog pa-4 pa-sm-6">
      <div class="assessment-dialog__title">
        معاينة المرفق
      </div>
      <div
        v-if="attachment"
        class="assessment-dialog__body"
      >
        <img
          v-if="kind === 'image'"
          :src="source"
          alt="معاينة المرفق"
          class="assessment-dialog__image"
        >
        <iframe
          v-else-if="kind === 'pdf'"
          :src="source"
          title="معاينة PDF"
          class="assessment-dialog__frame"
        />
        <video
          v-else-if="kind === 'video'"
          :src="source"
          controls
          class="assessment-dialog__video"
        />
        <div
          v-else
          class="assessment-empty-state"
        >
          هذا النوع لا يدعم المعاينة المباشرة داخل الصفحة.
        </div>
      </div>
      <div class="assessment-dialog__actions">
        <AppButton
          variant="secondary"
          @click="$emit('close')"
        >
          إغلاق
        </AppButton>
      </div>
    </v-card>
  </AppDialog>
</template>

<script>
import { AppButton, AppDialog } from '../ui';

export default {
  name: 'AttachmentPreviewDialog',
  components: { AppButton, AppDialog },
  props: {
    open: { type: Boolean, default: false },
    attachment: { type: Object, default: null },
    kind: { type: String, default: 'other' },
    source: { type: String, default: '' },
  },
};
</script>

<style scoped src="../../styles/components/attachment-preview-dialog.css"></style>
