<template>
  <section
    v-if="!['parts', 'indicators', 'final'].includes(activeSection)"
    class="dashboard-section"
  >
    <div
      v-if="activeSection === 'courses'"
      class="dashboard-card dashboard-card--overview-header student-course-filters-card"
    >
      <div class="student-course-filters-grid student-course-filters-grid--single">
        <div class="student-overview-filter student-overview-filter--stacked">
          <div class="student-overview-filter__label">
            الدورات
          </div>
          <AppSelect
            :value="courseId"
            aria-label="الدورات"
            :items="courseOptions"
            item-text="label"
            item-value="value"
            dense
            outlined
            hide-details
            class="dashboard-overview-filter__select"
            @input="$emit('update:course-id', $event)"
          />
        </div>
      </div>
    </div>
    <div
      v-else-if="activeSection === 'tasks'"
      class="dashboard-card dashboard-card--overview-header student-course-filters-card"
    >
      <div class="student-course-filters-grid student-course-filters-grid--single">
        <div class="student-overview-filter student-overview-filter--stacked">
          <div class="student-overview-filter__label">
            المهام الأدائية
          </div>
          <AppSelect
            :value="taskId"
            aria-label="المهام الأدائية"
            :items="taskOptions"
            item-text="label"
            item-value="value"
            dense
            outlined
            hide-details
            class="dashboard-overview-filter__select"
            @input="$emit('update:task-id', $event)"
          />
        </div>
      </div>
    </div>
    <div
      v-else-if="activeSection !== 'materials'"
      class="dashboard-card dashboard-card--overview-header student-summary-card"
    >
      <div class="dashboard-overview-header__top">
        <div class="dashboard-card__title-wrap">
          <h1 class="dashboard-card__title dashboard-card__title--overview">
            {{ title }}
          </h1>
          <div class="student-summary-card__subtitle">
            {{ description }}
          </div>
        </div>
      </div>
      <div class="student-summary-grid">
        <div
          v-for="item in summaryItems"
          :key="item.label"
          class="student-summary-chip"
        >
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import AppSelect from '../AppSelect.vue';

export default {
  name: 'StudentOverviewHeader',
  components: { AppSelect },
  props: {
    activeSection: { type: String, default: '' },
    courseId: { type: String, default: '' },
    taskId: { type: String, default: '' },
    courseOptions: { type: Array, default: () => [] },
    taskOptions: { type: Array, default: () => [] },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    login: { type: String, default: '' },
    branchLabel: { type: String, default: '' },
    reciterName: { type: String, default: '' },
    completedCount: { type: Number, default: 0 },
    partsLimit: { type: Number, default: 0 },
  },
  emits: ['update:course-id', 'update:task-id'],
  computed: {
    summaryItems() {
      return [
        { label: 'رقم الدخول', value: this.login || '---' },
        { label: 'الفرع', value: this.branchLabel },
        { label: 'المقرئ', value: this.reciterName || 'غير محدد' },
        { label: 'الأجزاء المقروءة', value: `${this.completedCount} / ${this.partsLimit}` },
      ];
    },
  },
};
</script>
