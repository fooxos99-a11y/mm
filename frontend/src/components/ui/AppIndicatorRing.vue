<template>
  <div
    class="dashboard-indicator-ring"
    :class="{ 'dashboard-indicator-ring--complete': progress >= 100, 'dashboard-indicator-ring--empty': progress <= 0 }"
    :style="activeStyle"
  >
    <svg
      viewBox="0 0 200 200"
      class="dashboard-indicator-ring__svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          :id="gradientId"
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
        :style="{ stroke: `url(#${gradientId})` }"
        cx="100"
        cy="100"
        r="78"
      />
    </svg>
    <div class="dashboard-indicator-ring__inner">
      {{ display }}
    </div>
  </div>
</template>
<script>
export default {
  name: 'AppIndicatorRing',
  props: { progress: { type: Number, default: 0 }, display: { type: [String, Number], required: true }, ringStyle: { type: Object, default: null } },
  computed: {
    gradientId() { return `app-indicator-gradient-${this.$.uid}`; },
    activeStyle() {
      if (this.ringStyle) return this.ringStyle;
      const circumference = 2 * Math.PI * 78;
      const percent = Number.isFinite(this.progress) ? Math.min(100, Math.max(0, this.progress)) : 0;
      return { '--indicator-dasharray': `${circumference * percent / 100} ${circumference}` };
    },
  },
};
</script>
<style src="../../styles/indicator-ring.css"></style>
