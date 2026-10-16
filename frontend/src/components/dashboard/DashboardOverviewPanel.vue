<template>
  <section
    id="overview"
    class="dashboard-section dashboard-section--hero"
  >
    <div class="dashboard-card dashboard-card--overview-header">
      <div class="dashboard-overview-header__top">
        <div class="dashboard-card__title-wrap">
          <h1 class="dashboard-card__title dashboard-card__title--overview">
            المؤشرات الإجمالية
          </h1>
        </div>
        <div
          v-if="showBranchFilter"
          class="dashboard-overview-filter"
        >
          <AppNativeSelect
            :value="selectedBranch"
            aria-label="تصفية المؤشرات حسب الفرع"
            class="dashboard-overview-filter__select"
            @input="$emit('update:selected-branch', $event)"
          >
            <option
              v-for="option in branchOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </AppNativeSelect>
        </div>
      </div>
    </div>

    <div class="dashboard-card dashboard-card--indicators">
      <div class="dashboard-indicators-grid">
        <fieldset
          v-for="indicator in indicators"
          :key="indicator.key"
          class="dashboard-indicator-card"
          :aria-label="`${indicator.label}: ${indicator.display}، ${indicator.meta}`"
        >
          <AppIndicatorRing
            :progress="indicator.progress"
            :display="animatedDisplay(indicator.display)"
            :ring-style="indicatorStyle(indicator.progress)"
          />
          <div class="dashboard-indicator-card__label">
            {{ indicator.label }}
          </div>
        </fieldset>
      </div>
    </div>
  </section>
</template>

<script>
import { AppIndicatorRing, AppNativeSelect } from '../ui';

export default {
  name: 'DashboardOverviewPanel',
  components: { AppIndicatorRing, AppNativeSelect },
  props: {
    animatedDisplay: { type: Function, required: true },
    branchOptions: { type: Array, default: () => [] },
    indicatorStyle: { type: Function, required: true },
    indicators: { type: Array, default: () => [] },
    selectedBranch: { type: String, default: 'all' },
    showBranchFilter: { type: Boolean, default: false },
  },
  emits: ['update:selected-branch'],
};
</script>

<style scoped>
.dashboard-indicator-card {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}
</style>
