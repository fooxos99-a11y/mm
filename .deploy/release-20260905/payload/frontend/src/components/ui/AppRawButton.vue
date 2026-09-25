<template>
  <button
    :type="nativeType"
    v-bind="$attrs"
  >
    <slot />
  </button>
</template>

<script>
export default {
  name: 'AppRawButton',
  inheritAttrs: false,
  props: {
    nativeType: {
      type: String,
      default: 'button',
    },
  },
};
</script>
