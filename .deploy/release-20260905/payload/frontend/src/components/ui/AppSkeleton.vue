<template>
  <div
    class="app-skeleton"
    :class="[`app-skeleton--${variant}`, { 'app-skeleton--animated': animated }]"
    :style="skeletonStyle"
    aria-hidden="true"
  />
</template>

<script>
export default {
  name: 'AppSkeleton',
  props: {
    variant: { type: String, default: 'text', validator: (value) => ['text', 'circle', 'rect'].includes(value) },
    width: { type: [String, Number], default: '100%' },
    height: { type: [String, Number], default: 16 },
    animated: { type: Boolean, default: true },
  },
  computed: {
    skeletonStyle() {
      const unit = (value) => (typeof value === 'number' ? `${value}px` : value);
      return { width: unit(this.width), height: unit(this.height) };
    },
  },
};
</script>
