<template>
  <div class="attachment-content">
    <AppLoadingSpinner
      v-if="loading"
      label="تحميل المرفق"
    />
    <img
      v-if="previewSource && resolvedKind === 'image'"
      :src="previewSource"
      :alt="attachment.fileName || 'الإجابة المرفقة'"
      @error="failed = true"
    >
    <iframe
      v-else-if="previewSource && resolvedKind === 'pdf'"
      :src="previewSource"
      :title="attachment.fileName || 'الإجابة المرفقة'"
    />
    <video
      v-else-if="previewSource && resolvedKind === 'video'"
      :src="previewSource"
      controls
      @error="failed = true"
    />
    <audio
      v-else-if="previewSource && resolvedKind === 'audio'"
      :src="previewSource"
      controls
      @error="failed = true"
    />
    <p
      v-if="failed"
      role="alert"
    >
      تعذّر عرض المرفق. يمكنك فتح الملف الأصلي.
    </p>
    <AppButton
      v-if="source"
      :href="source"
      target="_blank"
      rel="noopener noreferrer"
      variant="secondary"
    >
      فتح الملف الأصلي
    </AppButton>
  </div>
</template>

<script>
import { AppButton, AppLoadingSpinner } from '../ui';

export default {
  name: 'AttachmentContent',
  components: { AppButton, AppLoadingSpinner },
  props: { attachment: { type: Object, required: true }, kind: { type: String, default: '' } },
  data: () => ({ failed: false, loading: false, previewSource: '', objectUrl: '' }),
  computed: {
    source() { return this.attachment.fileDataUrl || ''; },
    resolvedKind() {
      if (this.kind) return this.kind;
      const type = this.attachment.fileType || '';
      if (type === 'application/pdf') return 'pdf';
      return ['image', 'video', 'audio'].find(kind => type.startsWith(`${kind}/`)) || 'other';
    },
  },
  watch: { source: { immediate: true, handler() { this.loadPreview(); } } },
  beforeUnmount() { this.releasePreview(); },
  methods: {
    releasePreview() {
      this.previewRequest?.abort();
      if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = '';
    },
    async loadPreview() {
      this.releasePreview();
      this.failed = false;
      this.previewSource = '';
      this.loading = false;
      if (!this.source || this.resolvedKind === 'other') return;
      if (/^(blob:|data:)/.test(this.source)) { this.previewSource = this.source; return; }
      const request = new AbortController();
      this.previewRequest = request;
      this.loading = true;
      try {
        const response = await fetch(this.source, { credentials: 'include', signal: request.signal });
        if (!response.ok) throw new Error('Attachment unavailable');
        const blob = await response.blob();
        if (request.signal.aborted) return;
        this.objectUrl = URL.createObjectURL(blob);
        this.previewSource = this.objectUrl;
      } catch (error) {
        if (error.name !== 'AbortError') this.failed = true;
      } finally {
        if (!request.signal.aborted) this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.attachment-content { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; min-width: 0; }
.attachment-content img, .attachment-content video, .attachment-content audio, .attachment-content iframe {
  display: block; width: 100%; max-width: 100%; border: 0; border-radius: 8px;
}
.attachment-content img, .attachment-content video { height: auto; object-fit: contain; }
.attachment-content iframe { height: 55dvh; min-height: 240px; background: var(--app-background); }
.attachment-content .app-button { justify-self: start; }
.attachment-content p { margin: 0; color: var(--app-danger); }
</style>
