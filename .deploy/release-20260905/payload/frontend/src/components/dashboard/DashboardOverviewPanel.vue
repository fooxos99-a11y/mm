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
        <article
          v-for="indicator in indicators"
          :key="indicator.key"
          class="dashboard-indicator-card"
          role="group"
          :aria-label="`${indicator.label}: ${indicator.display}، ${indicator.meta}`"
        >
          <div
            class="dashboard-indicator-ring"
            :class="{ 'dashboard-indicator-ring--complete': indicator.progress >= 100, 'dashboard-indicator-ring--empty': indicator.progress <= 0 }"
            :style="indicatorStyle(indicator.progress)"
          >
            <svg
              viewBox="0 0 200 200"
              class="dashboard-indicator-ring__svg"
              aria-hidden="true"
            >
              <defs>
                <linearGradient
                  :id="`dashboard-indicator-gradient-${indicator.key}`"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop
                    offset="0%"
                    stop-color="#2a94b2"
                  />
                  <stop
                    offset="55%"
                    stop-color="#1b7692"
                  />
                  <stop
                    offset="100%"
                    stop-color="#0d5a73"
                  />
                </linearGradient>
              </defs>
              <circle
                class="dashboard-indicator-ring__track"
                cx="100"
                cy="100"
                r="78"
              />
              <circle
                class="dashboard-indicator-ring__progress"
                :style="{ stroke: `url(#dashboard-indicator-gradient-${indicator.key})` }"
                cx="100"
                cy="100"
                r="78"
              />
            </svg>
            <div class="dashboard-indicator-ring__inner">
              {{ animatedDisplay(indicator.display) }}
            </div>
          </div>
          <div class="dashboard-indicator-card__label">
            {{ indicator.label }}
          </div>
          <div class="dashboard-indicator-card__meta">
            {{ indicator.meta }}
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script>
import { AppNativeSelect } from '../ui';

export default {
  name: 'DashboardOverviewPanel',
  components: { AppNativeSelect },
  props: {
    animatedDisplay: { type: Function, required: true },
    branchOptions: { type: Array, default: () => [] },
    indicatorStyle: { type: Function, required: true },
    indicators: { type: Array, default: () => [] },
    selectedBranch: { type: String, default: 'all' },
    showBranchFilter: { type: Boolean, default: false },
  },
};
</script>
