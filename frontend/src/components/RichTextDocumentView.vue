<template>
  <!-- eslint-disable vue/no-v-html -->
  <div class="rich-text-document-view">
    <div class="rich-text-document-view__surface">
      <div
        class="rich-text-document-view__page ql-editor"
        :style="pageStyle"
        v-html="sanitizedValue"
      />
    </div>
  </div>
  <!-- eslint-enable vue/no-v-html -->
</template>

<script>
import { sanitizeRichTextHtml } from '@/utils/documentContent';

export default {
  name: 'RichTextDocumentView',
  props: {
    value: {
      type: String,
      default: '',
    },
    minHeight: {
      type: String,
      default: '320px',
    },
  },
  computed: {
    sanitizedValue() {
      return sanitizeRichTextHtml(this.value || '');
    },
    pageStyle() {
      return {
        '--rich-text-document-min-height': this.minHeight,
      };
    },
  },
};
</script>

<style scoped>
.rich-text-document-view {
  width: 100%;
}

.rich-text-document-view__surface {
  position: relative;
  padding: 20px 14px 28px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 22px;
  background: linear-gradient(180deg, #eef3f7 0%, #e9eff4 100%);
  overflow-x: auto;
}

.rich-text-document-view__page {
  width: min(100%, 210mm);
  min-height: max(var(--rich-text-document-min-height), 297mm);
  margin: 0 auto;
  padding: 25.4mm;
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 24px 50px rgba(15, 23, 42, 0.12);
  border: 1px solid rgba(148, 163, 184, 0.16);
  direction: rtl;
  text-align: right;
  line-height: 1.9;
  overflow-wrap: anywhere;
}

.rich-text-document-view__page :deep(p),
.rich-text-document-view__page :deep(h1),
.rich-text-document-view__page :deep(h2),
.rich-text-document-view__page :deep(h3),
.rich-text-document-view__page :deep(li),
.rich-text-document-view__page :deep(blockquote) {
  text-align: right;
}

.rich-text-document-view__page :deep(img) {
  display: block;
  max-width: none;
  height: auto;
  margin: 18px auto;
  border-radius: 10px;
  transform-origin: center center;
}

.rich-text-document-view__page :deep(table) {
  max-width: none;
}

.rich-text-document-view__page :deep(.ql-font-tahoma) {
  font-family: Tahoma, Arial, sans-serif;
}

.rich-text-document-view__page :deep(.ql-font-arial) {
  font-family: Arial, Helvetica, sans-serif;
}

.rich-text-document-view__page :deep(.ql-font-segoe-ui) {
  font-family: 'Segoe UI', Tahoma, sans-serif;
}

.rich-text-document-view__page :deep(.ql-font-traditional-arabic) {
  font-family: 'Traditional Arabic', Tahoma, serif;
}

.rich-text-document-view__page :deep(.ql-font-simplified-arabic) {
  font-family: 'Simplified Arabic', Tahoma, sans-serif;
}

.rich-text-document-view__page :deep(.ql-font-arabic-typesetting) {
  font-family: 'Arabic Typesetting', 'Traditional Arabic', Tahoma, serif;
}

@media (max-width: 900px) {
  .rich-text-document-view__surface {
    padding-left: 8px;
    padding-right: 8px;
  }

  .rich-text-document-view__page {
    width: 100%;
    min-height: var(--rich-text-document-min-height);
    padding: 20px 16px;
    box-shadow: 0 16px 32px rgba(15, 23, 42, 0.1);
  }
}
</style>