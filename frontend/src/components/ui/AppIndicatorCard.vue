<template>
  <div
    class="dashboard-indicator-card app-indicator-card"
    role="group"
    :aria-label="`${label}: ${display}، ${meta}`"
  >
    <AppIndicatorRing
      appearance="metric"
      :progress="progress"
      :display="animatedValue"
      :color="color"
    />
    <div class="dashboard-indicator-card__label">
      {{ label }}
    </div>
  </div>
</template>

<script>
import AppIndicatorRing from './AppIndicatorRing.vue';

export default {
  name: 'AppIndicatorCard',
  components: { AppIndicatorRing },
  props: {
    label: { type: String, required: true },
    display: { type: [String, Number], required: true },
    animatedValue: { type: [String, Number], required: true },
    meta: { type: String, default: '' },
    progress: { type: Number, default: 0 },
    color: { type: String, default: '#0d9488' },
  },
};
</script>

<style scoped>
@font-face {
  font-family: 'Cairo Indicators';
  src: url('../../assets/fonts/cairo/cairo-arabic.woff2') format('woff2');
  font-weight: 400 900;
  font-display: swap;
  unicode-range: U+0600-06FF, U+0750-077F, U+0870-088E, U+0890-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC;
}

@font-face {
  font-family: 'Cairo Indicators';
  src: url('../../assets/fonts/cairo/cairo-latin.woff2') format('woff2');
  font-weight: 400 900;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

.dashboard-page .dashboard-indicator-card.app-indicator-card {
  box-sizing: border-box;
  display: flex;
  min-width: 0;
  min-height: 192px;
  margin: 0;
  padding: 16px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: hsl(176 62% 13%);
  box-shadow: none;
  text-align: center;
  font-family: 'Cairo Indicators', sans-serif;
}

.dashboard-page .app-indicator-card :deep(.dashboard-indicator-ring--metric) {
  width: 112px;
  height: 112px;
  flex-shrink: 0;
  filter: none;
}

.dashboard-page .app-indicator-card :deep(.dashboard-indicator-ring__inner) {
  width: 100%;
  height: 100%;
  background: transparent;
  box-shadow: none;
  color: hsl(176 62% 13%);
  font-size: 20px;
  line-height: 28px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  letter-spacing: normal;
}

.dashboard-page .dashboard-indicator-card.app-indicator-card .dashboard-indicator-card__label {
  max-width: 100%;
  margin: 0;
  color: inherit;
  font-size: 14px;
  font-weight: 700;
  line-height: 20px;
  white-space: normal;
  overflow-wrap: anywhere;
}
</style>
