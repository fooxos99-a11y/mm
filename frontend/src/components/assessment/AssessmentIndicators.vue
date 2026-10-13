<template>
  <section
    class="assessment-indicators"
    aria-label="مؤشرات الاختبار"
  >
    <article
      class="assessment-indicator"
      :aria-label="indicatorLabel('الاختبار القبلي', preValue, pre)"
    >
      <AppIndicatorRing
        :progress="pre.percent"
        :display="preValue"
      />
      <h2>الاختبار القبلي</h2>
      <p>{{ pre.submitted }} معلم</p>
    </article>
    <article
      class="assessment-indicators__change"
      :class="changeClass"
    >
      <h2>الأداء</h2>
      <bdi class="assessment-indicators__difference">{{ changeLabel }}</bdi>
      <p
        v-if="!complete"
        class="assessment-indicators__warning"
      >
        النتائج غير مكتملة
      </p>
      <span class="d-sr-only">{{ complete ? 'فرق نسبة المتوسط بالنقاط المئوية' : 'تحتاج المقارنة إلى نتائج ودرجة كلية لكل اختبار' }}</span>
    </article>
    <article
      class="assessment-indicator"
      :aria-label="indicatorLabel('الاختبار البعدي', postValue, post)"
    >
      <AppIndicatorRing
        :progress="post.percent"
        :display="postValue"
      />
      <h2>الاختبار البعدي</h2>
      <p>{{ post.submitted }} معلم</p>
    </article>
  </section>
</template>
<script>
import { AppIndicatorRing } from '../ui';
export default {
  name: 'AssessmentIndicators', components: { AppIndicatorRing },
  props: {
    pre: { type: Object, required: true }, post: { type: Object, required: true },
    preValue: { type: String, required: true }, postValue: { type: String, required: true },
    totalStudents: { type: Number, required: true }, difference: { type: Number, default: 0 },
  },
  computed: {
    complete() { return this.pre.submitted > 0 && this.post.submitted > 0 && this.pre.totalPoints > 0 && this.post.totalPoints > 0; },
    changeLabel() { return this.complete ? `${this.difference > 0 ? '+' : ''}${Math.round(this.difference)}%` : '—'; },
    changeClass() { return this.complete && this.difference !== 0 ? `assessment-indicators__change--${this.difference > 0 ? 'positive' : 'negative'}` : ''; },
  },
  methods: {
    indicatorLabel(title, value, data) { return `${title}: متوسط الدرجة ${value} من ${data.totalPoints}، معلمون بنتائج ${data.submitted} من ${this.totalStudents}`; },
  },
};
</script>
<style scoped>
.assessment-indicators { display: grid; grid-template-columns: minmax(0, 1fr) minmax(56px, .7fr) minmax(0, 1fr); align-items: center; gap: 8px; padding-block: 16px; }
.assessment-indicator { display: grid; justify-items: center; align-content: start; gap: 8px; min-width: 0; text-align: center; }
.assessment-indicator :deep(.dashboard-indicator-ring) { width: min(100%, clamp(80px, 20vw, 174px)); height: auto; aspect-ratio: 1; filter: none; }
.assessment-indicator :deep(.dashboard-indicator-ring__inner) { font-size: clamp(1rem, 4vw, 2rem); }
.assessment-indicators h2 { margin: 0; font-size: var(--app-font-sm); color: var(--app-primary-dark); line-height: 1.5; }
.assessment-indicators p { margin: 0; font-size: var(--app-font-sm); color: var(--app-text-muted); }
.assessment-indicators__change { display: grid; justify-items: center; gap: 8px; min-width: 0; text-align: center; }
.assessment-indicators__difference { font-size: clamp(1rem, 4vw, 1.75rem); font-weight: 700; color: var(--app-primary-dark); }
.assessment-indicators__change--positive .assessment-indicators__difference { color: var(--app-success); }
.assessment-indicators__change--negative .assessment-indicators__difference { color: var(--app-danger); }
.assessment-indicators__warning { overflow-wrap: anywhere; }
@media (min-width: 768px) { .assessment-indicators { gap: 24px; padding-block: 24px; } }
</style>
