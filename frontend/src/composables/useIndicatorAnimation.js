import { onBeforeUnmount, ref } from 'vue';
import { splitDisplayNumber } from '../utils/displayNumber.mjs';

const easeOutCubic = (value) => 1 - ((1 - value) ** 3);

const currentTime = () => (
  typeof window !== 'undefined' && typeof window.performance?.now === 'function'
    ? window.performance.now()
    : Date.now()
);

// Animates indicator numbers and progress bars from 0 to their value.
// Returned members are exposed on `this` for Options-API components via setup().
export function useIndicatorAnimation() {
  const indicatorAnimationProgress = ref(0);
  let frameId = null;

  const stopIndicatorAnimation = () => {
    if (frameId && typeof window !== 'undefined') {
      window.cancelAnimationFrame(frameId);
    }

    frameId = null;
  };

  const restartIndicatorAnimation = (duration = 1400) => {
    stopIndicatorAnimation();

    if (typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
      indicatorAnimationProgress.value = 1;
      return;
    }

    const startTime = currentTime();
    indicatorAnimationProgress.value = 0;

    const tick = (timestamp) => {
      const now = typeof timestamp === 'number' ? timestamp : Date.now();
      const linearProgress = duration > 0 ? Math.min(1, (now - startTime) / duration) : 1;

      indicatorAnimationProgress.value = easeOutCubic(linearProgress);
      frameId = linearProgress < 1 ? window.requestAnimationFrame(tick) : null;
    };

    frameId = window.requestAnimationFrame(tick);
  };

  const animatedIndicatorPercent = (percent) => {
    const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
    return safePercent * indicatorAnimationProgress.value;
  };

  const animatedIndicatorDisplay = (display) => {
    const text = String(display ?? '');
    const parts = text && text !== '--' ? splitDisplayNumber(text) : null;

    if (!parts) {
      return text;
    }

    const [prefix, rawValue, suffix] = parts;
    const targetValue = Number(rawValue);

    if (!Number.isFinite(targetValue)) {
      return text;
    }

    const decimals = (rawValue.split('.')[1] || '').length;
    const animatedValue = targetValue * indicatorAnimationProgress.value;
    const formattedValue = decimals > 0 ? animatedValue.toFixed(decimals) : String(Math.round(animatedValue));

    return `${prefix}${formattedValue}${suffix}`;
  };

  onBeforeUnmount(stopIndicatorAnimation);

  return {
    indicatorAnimationProgress,
    stopIndicatorAnimation,
    restartIndicatorAnimation,
    animatedIndicatorPercent,
    animatedIndicatorDisplay,
  };
}
