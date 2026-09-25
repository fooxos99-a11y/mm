<template>
  <div
    class="app-dialog-footer"
    :class="{ 'app-dialog-footer--stack': stack }"
  >
    <slot />
  </div>
</template>

<script>
export default {
  name: 'AppDialogFooter',
  props: {
    stack: {
      type: Boolean,
      default: false,
    },
  },
};
</script>
