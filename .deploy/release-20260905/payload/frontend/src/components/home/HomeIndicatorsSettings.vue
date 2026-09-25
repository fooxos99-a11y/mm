<template>
  <section class="home-page-settings__section">
    <div class="home-page-settings__section-header">
      <h3>المؤشرات</h3>
    </div>
    <div class="home-page-settings__grid">
      <AppTextField
        v-model="localForm.statsEyebrow"
        label="العنوان الصغير للمؤشرات"
        outlined
        dense
        hide-details="auto"
      />
      <AppTextField
        v-model="localForm.statsTitlePrefix"
        label="بداية عنوان المؤشرات"
        outlined
        dense
        hide-details="auto"
      />
      <AppTextField
        v-model="localForm.statsTitleHighlight"
        label="الكلمة المميزة في عنوان المؤشرات"
        outlined
        dense
        hide-details="auto"
      />
      <AppTextField
        v-model="localForm.indicatorLabels.memorization"
        label="مؤشر الأجزاء المقروءة"
        outlined
        dense
        hide-details="auto"
      />
      <AppTextField
        v-model="localForm.indicatorLabels.attendance"
        label="مؤشر الحضور"
        outlined
        dense
        hide-details="auto"
      />
      <AppTextField
        v-model="localForm.indicatorLabels.assessments"
        label="مؤشر الاختبار القبلي والبعدي"
        outlined
        dense
        hide-details="auto"
      />
      <AppTextField
        v-model="localForm.indicatorLabels.courses"
        label="مؤشر الدورات"
        outlined
        dense
        hide-details="auto"
      />
      <AppTextField
        v-model="localForm.indicatorLabels.tasks"
        label="مؤشر المهام الأدائية"
        outlined
        dense
        hide-details="auto"
      />
      <AppTextField
        v-model="localForm.indicatorLabels.completed30"
        label="مؤشر من أتموا 30 جزءًا"
        outlined
        dense
        hide-details="auto"
      />
    </div>
  </section>
</template>

<script>
import { AppTextField } from '../ui';

export default {
  name: 'HomeIndicatorsSettings',
  components: { AppTextField },
  props: { form: { type: Object, required: true } },
  data() { return { localForm: this.form }; },
  watch: { form(value) { this.localForm = value; } },
};
</script>
