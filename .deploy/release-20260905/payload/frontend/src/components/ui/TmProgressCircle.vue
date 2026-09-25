<template>
  <div
    class="tm-progress-circle"
    :style="{ '--p': normalizedProgress }"
  >
    <svg viewBox="0 0 120 120">
      <defs>
        <linearGradient
          id="grad-circle"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop
            offset="0%"
            stop-color="#0f5670"
          />
          <stop
            offset="100%"
            stop-color="#1a718f"
          />
        </linearGradient>
      </defs>
      <circle
        class="track"
        cx="60"
        cy="60"
        r="52"
        pathLength="100"
      />
      <circle
        class="value"
        cx="60"
        cy="60"
        r="52"
        pathLength="100"
        stroke="url(#grad-circle)"
      />
    </svg>
    <div class="tm-progress-circle__inner">
      <slot />
    </div>
  </div>
</template>

<script>
export default {
  name: 'TmProgressCircle',
  props: {
    progress: {
      type: Number,
      default: 0,
    },
  },
  computed: {
    normalizedProgress() {
      if (!Number.isFinite(this.progress)) {
        return 0;
      }

      return Math.max(0, Math.min(100, Math.round(this.progress)));
    },
  },
};
</script>

<style scoped>
.tm-progress-circle {
  position: relative;
  width: 140px;
  height: 140px;
  display: grid;
  place-items: center;
}

.tm-progress-circle svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
  overflow: visible;
}

.tm-progress-circle circle {
  fill: none;
  stroke-width: 14;
}

.tm-progress-circle .track {
  stroke: #d1d5db;
  opacity: 0.9;
}

.tm-progress-circle .value {
  stroke-linecap: round;
  stroke-dasharray: var(--p) 100;
  filter: drop-shadow(0 6px 12px rgba(15, 23, 42, 0.15));
  animation: tmProgressDraw 1.2s ease both;
}

.tm-progress-circle__inner {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #0f5670;
  font-size: 2.2rem;
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1;
  transform: translateY(1px);
}

@keyframes tmProgressDraw {
  from {
    stroke-dasharray: 0 100;
  }

  to {
    stroke-dasharray: var(--p) 100;
  }
}
</style>
