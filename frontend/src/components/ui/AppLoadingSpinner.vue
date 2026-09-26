<template>
  <output
    class="app-spinner"
    :class="`app-spinner--${size}`"
    :aria-label="label"
  >
    <span
      class="app-spinner__ring"
      aria-hidden="true"
    />
    <span
      v-if="showLabel"
      class="app-spinner__label"
    >{{ label }}</span>
  </output>
</template>

<script>
export default {
  name: 'AppLoadingSpinner',
  props: {
    size: { type: String, default: 'md', validator: (value) => ['sm', 'md', 'lg'].includes(value) },
    label: { type: String, default: 'جارٍ التحميل' },
    showLabel: { type: Boolean, default: false },
  },
};
</script>
