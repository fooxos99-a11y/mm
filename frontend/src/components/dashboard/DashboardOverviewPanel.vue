<template>
  <section
    id="overview"
    class="dashboard-section dashboard-metrics"
  >
    <AppCard class="admin-workspace-card dashboard-overview-card">
      <div class="dashboard-overview-card__header">
        <component
          :is="headingTag"
          class="dashboard-overview-card__title"
        >
          المؤشرات الإجمالية
        </component>
        <slot name="filter">
          <div
            v-if="showBranchFilter"
            class="dashboard-overview-filter"
          >
            <AppSelect
              :value="selectedBranch"
              :items="branchOptions"
              item-text="label"
              item-value="value"
              hide-details
              aria-label="تصفية المؤشرات حسب الفرع"
              class="dashboard-overview-filter__select"
              @input="$emit('update:selected-branch', $event)"
            />
          </div>
        </slot>
      </div>
      <AppErrorState
        v-if="error"
        :message="error"
        @retry="$emit('retry')"
      />
      <AppLoadingSpinner
        v-else-if="loading"
        label="جارٍ تحميل المؤشرات"
      />
      <div
        v-else
        class="dashboard-indicators-grid dashboard-indicators-grid--metrics"
      >
        <AppIndicatorCard
          v-for="indicator in indicators"
          :key="indicator.key"
          :label="indicator.label"
          :display="indicator.display"
          :animated-value="animatedDisplay(indicator.display)"
          :progress="animatedProgress(indicator.progress)"
          :meta="indicator.meta"
          :color="indicatorColors[indicator.key]"
        />
      </div>
    </AppCard>
  </section>
</template>

<script>
import { AppCard, AppErrorState, AppIndicatorCard, AppLoadingSpinner, AppSelect } from '../ui';

const indicatorColors = Object.freeze({
  memorization: '#0d9488', attendance: '#ea580c', pre: '#2563eb',
  post: '#2a78d6', tasks: '#4f46e5', completed30: '#e11d48',
});

export default {
  name: 'DashboardOverviewPanel',
  components: { AppCard, AppErrorState, AppIndicatorCard, AppLoadingSpinner, AppSelect },
  props: {
    animatedDisplay: { type: Function, required: true },
    branchOptions: { type: Array, default: () => [] },
    animatedProgress: { type: Function, required: true },
    indicators: { type: Array, default: () => [] },
    selectedBranch: { type: String, default: 'all' },
    showBranchFilter: { type: Boolean, default: false },
    headingTag: { type: String, default: 'h1' },
    loading: Boolean,
    error: { type: String, default: '' },
  },
  emits: ['update:selected-branch', 'retry'],
  data: () => ({ indicatorColors }),
};
</script>

<style scoped>
.dashboard-overview-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--app-border);
}
.dashboard-overview-card__title {
  margin: 0;
  color: var(--app-ui-text);
  font-size: var(--app-font-sm);
  font-weight: var(--app-weight-label);
  line-height: 1.5;
}
.dashboard-page .dashboard-overview-filter {
  width: min(180px, 50%);
  flex-shrink: 0;
}

.dashboard-page .dashboard-indicators-grid.dashboard-indicators-grid--metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

@media (min-width: 768px) {
  .dashboard-page .dashboard-indicators-grid.dashboard-indicators-grid--metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
