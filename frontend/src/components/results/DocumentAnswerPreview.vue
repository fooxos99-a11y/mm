<template>
  <section
    class="document-answer-preview"
    :aria-label="`${label} بصيغة PDF`"
  >
    <div class="document-answer-preview__toolbar">
      <strong>{{ label }}</strong>
      <AppButton
        v-if="pdfUrl"
        :href="pdfUrl"
        :download="fileName"
        variant="secondary"
      >
        تحميل PDF
      </AppButton>
    </div>
    <p
      v-if="pages.length"
      class="document-answer-preview__text"
    >
      {{ plainText }}
    </p>
    <AppLoadingSpinner
      v-if="loading"
      label="جارٍ تجهيز PDF"
    />
    <div
      v-else-if="error"
      class="document-answer-preview__error"
      role="alert"
    >
      <p>تعذّر تجهيز PDF. أعد المحاولة لعرض المستند كاملًا.</p>
      <AppButton
        variant="secondary"
        @click="loadPreview"
      >
        إعادة المحاولة
      </AppButton>
      <details>
        <summary>عرض المستند الأصلي</summary>
        <RichTextDocumentView
          :value="value"
          compact
          min-height="0"
        />
      </details>
    </div>
    <div
      v-else
      class="document-answer-preview__pages"
      tabindex="0"
      :aria-label="`صفحات ${label}`"
    >
      <figure
        v-for="(page, index) in pages"
        :key="index"
      >
        <img
          :src="page"
          :alt="`${label} - الصفحة ${index + 1}`"
        >
        <figcaption dir="ltr">
          {{ index + 1 }} / {{ pages.length }}
        </figcaption>
      </figure>
    </div>
    <div
      v-if="loading"
      ref="source"
      class="document-answer-preview__source"
      aria-hidden="true"
      inert
    >
      <RichTextDocumentView
        :value="value"
        min-height="0"
      />
    </div>
  </section>
</template>

<script>
import { AppButton, AppLoadingSpinner } from '../ui';
import 'quill/dist/quill.core.css';
import RichTextDocumentView from '../RichTextDocumentView.vue';
import { createDocumentAnswerPdf } from '../../services/documentPdf';
import { stripRichTextMarkup } from '../../utils/documentContent';

export default {
  name: 'DocumentAnswerPreview',
  components: { AppButton, AppLoadingSpinner, RichTextDocumentView },
  props: {
    value: { type: String, required: true },
    fileName: { type: String, default: 'إجابة المعلم.pdf' },
    label: { type: String, default: 'إجابة المعلم' },
  },
  data: () => ({ loading: true, error: false, pages: [], pdfUrl: '' }),
  computed: { plainText() { return stripRichTextMarkup(this.value); } },
  watch: { value() { this.loadPreview(); } },
  mounted() { this.loadPreview(); },
  beforeUnmount() { this.releasePreview(); },
  methods: {
    releasePreview() {
      this.previewRequest?.abort();
      if (this.pdfUrl) URL.revokeObjectURL(this.pdfUrl);
      this.pdfUrl = '';
    },
    async loadPreview() {
      this.releasePreview();
      const request = new AbortController();
      this.previewRequest = request;
      this.loading = true; this.error = false; this.pages = [];
      try {
        await this.$nextTick();
        const element = this.$refs.source.querySelector('.rich-text-document-view__page');
        const result = await createDocumentAnswerPdf(element, { signal: request.signal });
        if (request.signal.aborted) return;
        this.pdfUrl = URL.createObjectURL(result.blob);
        this.pages = result.pages;
      } catch (error) {
        if (!request.signal.aborted) this.error = true;
      } finally {
        if (!request.signal.aborted) this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.document-answer-preview { display: grid; gap: 12px; min-width: 0; }
.document-answer-preview__text { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: pre-wrap; }
.document-answer-preview__toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.document-answer-preview__pages { max-height: 60dvh; min-height: 220px; overflow: auto; padding: 12px; border: 1px solid var(--app-border); border-radius: var(--app-radius-control); background: var(--app-background); }
.document-answer-preview__pages figure { display: flex; flex-direction: column; width: 100%; min-width: 100%; box-sizing: border-box; aspect-ratio: 210 / 297; margin: 0 0 16px; padding: 6.67%; background: #fff; border: 1px solid var(--app-border); }
.document-answer-preview__pages figure:last-child { margin-bottom: 0; }
.document-answer-preview__pages img { display: block; width: 100%; height: auto; }
.document-answer-preview__pages figcaption { margin-top: auto; padding-top: 12px; color: var(--app-text-muted); text-align: center; font-size: var(--app-font-sm); }
.document-answer-preview__pages:focus-visible { outline: 2px solid var(--app-primary); outline-offset: 2px; }
.document-answer-preview__error { display: grid; gap: 12px; }
.document-answer-preview__error p { margin: 0; color: var(--app-danger); }
.document-answer-preview__error .app-button { justify-self: start; }
.document-answer-preview__error summary { cursor: pointer; min-height: 44px; padding-block: 12px; }
.document-answer-preview__source { position: fixed; top: 0; left: -20000px; width: 688px; pointer-events: none; }
.document-answer-preview__source :deep(.rich-text-document-view__surface) { padding: 0; border: 0; border-radius: 0; overflow: visible; background: #fff; }
.document-answer-preview__source :deep(.rich-text-document-view__page) { width: 688px; min-height: 1px; padding: 0; margin: 0; border: 0; box-shadow: none; font-size: 16px; background: #fff; }
.document-answer-preview__source :deep(img) { max-width: 100%; }
.document-answer-preview__source :deep(table) { max-width: 100%; table-layout: fixed; }
.document-answer-preview__source :deep(td), .document-answer-preview__source :deep(th) { overflow-wrap: anywhere; }
.document-answer-preview__source :deep(.ql-align-center) { text-align: center; }
.document-answer-preview__source :deep(.ql-align-left) { text-align: left; }
.document-answer-preview__source :deep(.ql-align-justify) { text-align: justify; }
</style>
