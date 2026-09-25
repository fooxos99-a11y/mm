<template>
  <div
    class="app-dialog-body"
    :class="{ 'app-dialog-body--compact': compact }"
  >
    <slot />
  </div>
</template>

<script>
export default {
  name: 'AppDialogBody',
  props: {
    compact: {
      type: Boolean,
      default: false,
    },
  },
};
</script>
