const DISPLAY_NUMBER_PATTERN = /^(.*?)([+-]?\d+(?:\.\d+)?)([^\d]*)$/;

const easeOutCubic = (value) => 1 - ((1 - value) ** 3);

export default {
  data() {
    return {
      indicatorAnimationProgress: 0,
      indicatorAnimationFrameId: null,
    };
  },
  beforeUnmount() {
    this.stopIndicatorAnimation();
  },
  methods: {
    stopIndicatorAnimation() {
      if (this.indicatorAnimationFrameId && typeof window !== 'undefined') {
        window.cancelAnimationFrame(this.indicatorAnimationFrameId);
      }

      this.indicatorAnimationFrameId = null;
    },
    restartIndicatorAnimation(duration = 1400) {
      this.stopIndicatorAnimation();

      if (typeof window === 'undefined') {
        this.indicatorAnimationProgress = 1;
        return;
      }

      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.indicatorAnimationProgress = 1;
        return;
      }

      const startTime = window.performance && typeof window.performance.now === 'function'
        ? window.performance.now()
        : Date.now();

      this.indicatorAnimationProgress = 0;

      const tick = (timestamp) => {
        const now = typeof timestamp === 'number' ? timestamp : Date.now();
        const elapsed = now - startTime;
        const linearProgress = duration > 0 ? Math.min(1, elapsed / duration) : 1;

        this.indicatorAnimationProgress = easeOutCubic(linearProgress);

        if (linearProgress < 1) {
          this.indicatorAnimationFrameId = window.requestAnimationFrame(tick);
          return;
        }

        this.indicatorAnimationFrameId = null;
      };

      this.indicatorAnimationFrameId = window.requestAnimationFrame(tick);
    },
    animatedIndicatorPercent(percent) {
      const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
      return safePercent * this.indicatorAnimationProgress;
    },
    animatedIndicatorDisplay(display) {
      const text = String(display ?? '');

      if (!text || text === '--') {
        return text;
      }

      const match = text.match(DISPLAY_NUMBER_PATTERN);

      if (!match) {
        return text;
      }

      const [, prefix, rawValue, suffix] = match;
      const targetValue = Number(rawValue);

      if (!Number.isFinite(targetValue)) {
        return text;
      }

      const decimals = (rawValue.split('.')[1] || '').length;
      const animatedValue = targetValue * this.indicatorAnimationProgress;
      const formattedValue = decimals > 0
        ? animatedValue.toFixed(decimals)
        : String(Math.round(animatedValue));

      return `${prefix}${formattedValue}${suffix}`;
    },
  },
};
