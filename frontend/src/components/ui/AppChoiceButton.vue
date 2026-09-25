<template>
  <button
    :type="nativeType"
    class="app-choice-button"
    :class="buttonClasses"
    :disabled="disabled"
    v-bind="$attrs"
  >
    <span class="app-choice-button__content">
      <slot />
    </span>
  </button>
</template>

<script>
export default {
  name: 'AppChoiceButton',
  inheritAttrs: false,
  props: {
    variant: {
      type: String,
      default: 'soft',
      validator: (value) => ['soft', 'tab'].includes(value),
    },
    active: {
      type: Boolean,
      default: false,
    },
    block: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    nativeType: {
      type: String,
      default: 'button',
    },
  },
  computed: {
    buttonClasses() {
      return {
        [`app-choice-button--${this.variant}`]: true,
        'app-choice-button--active': this.active,
        'app-choice-button--block': this.block,
      };
    },
  },
};
</script>
