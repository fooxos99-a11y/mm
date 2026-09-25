<template>
  <svg
    class="app-svg-icon"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="path" />
  </svg>
</template>

<script>
import { resolveAppIconPath } from '@/plugins/icons';

export default {
  name: 'AppSvgIcon',
  props: { icon: { type: String, default: '' } },
  computed: {
    path() {
      const icon = Array.isArray(this.icon) ? this.icon[0] : this.icon;
      return resolveAppIconPath(icon);
    },
  },
};
</script>

<style scoped>
.app-svg-icon {
  display: block;
  width: 1em;
  height: 1em;
  fill: currentColor;
}
</style>
