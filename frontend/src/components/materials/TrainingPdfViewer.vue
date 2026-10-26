<template>
  <section
    class="training-pdf"
    aria-label="عارض المادة التدريبية"
  >
    <div class="training-pdf__toolbar">
      <span aria-live="polite">{{ pageCount ? `${pageCount} صفحة` : 'جارٍ فتح المستند…' }}</span>
    </div>
    <div
      ref="scroller"
      class="training-pdf__scroller"
      tabindex="0"
      aria-label="صفحات المستند"
    >
      <p
        v-if="error"
        role="alert"
      >
        {{ error }}
      </p>
      <p
        v-else-if="!pageCount"
        role="status"
      >
        جارٍ تحميل الصفحات الأولى…
      </p>
      <div
        class="training-pdf__pages"
      >
        <TrainingPdfPage
          v-for="number in pageCount"
          :key="`${generation}-${number}`"
          :document="pdf"
          :number="number"
          :root="scroller"
        />
      </div>
    </div>
  </section>
</template>

<script setup>
import { markRaw, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import TrainingPdfPage from './TrainingPdfPage.vue';
import apiClient from '../../services/httpClient';
import { createTrainingPdfTask } from '../../services/trainingPdf.js';

const props = defineProps({ source: { type: String, required: true } });
const pdf = shallowRef(null);
const scroller = ref(null);
const pageCount = ref(0);
const error = ref('');
const generation = ref(0);
let task;
let abort;
let disposed = false;
async function open() {
  const attempt = ++generation.value;
  abort?.abort();
  abort = new AbortController();
  await task?.destroy();
  error.value = '';
  pageCount.value = 0;
  pdf.value = null;
  try {
    const nextTask = await createTrainingPdfTask(props.source, apiClient.defaults.headers.common, abort.signal);
    if (disposed || attempt !== generation.value) { await nextTask.destroy(); return; }
    task = nextTask;
    nextTask.onRangeError = () => { error.value = 'انقطع تحميل المستند. أغلق النافذة وافتح الملف مجددًا لمتابعة القراءة.'; };
    const document = await nextTask.promise;
    if (disposed || attempt !== generation.value) return;
    pdf.value = markRaw(document);
    pageCount.value = document.numPages;
    // Warm the first two pages and the following page in the background. Only
    // nearby canvases are rendered; distant pages keep no bitmap allocation.
    for (let number = 1; number <= Math.min(3, document.numPages); number++) {
      document.getPage(number).then((page) => page.getOperatorList()).catch(() => {});
    }
  } catch (cause) {
    if (disposed || attempt !== generation.value) return;
    error.value = cause?.name === 'PasswordException'
      ? 'المستند محمي بكلمة مرور. نزّل الأصل لفتحه.'
      : 'تعذر عرض المستند. أغلق النافذة وافتح الملف مجددًا أو نزّل الملف الأصلي.';
  }
}
onMounted(open);
onBeforeUnmount(() => { disposed = true; generation.value++; abort?.abort(); task?.destroy(); });
</script>

<style scoped>
.training-pdf { display: flex; flex: 1; flex-direction: column; min-width: 0; min-height: 0; background: #f0f5f8; border: 1px solid #d8e2e8; border-radius: 16px; overflow: hidden; }
.training-pdf__toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding: 10px; background: white; color: #14415d; }
.training-pdf__scroller { flex: 1; height: 64dvh; min-height: 140px; overflow: auto; overscroll-behavior: contain; padding: 8px; direction: ltr; }
.training-pdf__pages { width: 100%; display: grid; gap: 14px; margin-inline: auto; }
.training-pdf__scroller > p { direction: rtl; padding: 16px; text-align: center; }
@media (max-width: 600px) { .training-pdf__toolbar { font-size: .85rem; } }
</style>
