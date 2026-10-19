<template>
  <router-link
    v-if="to"
    :to="to"
    :aria-disabled="isDisabled ? 'true' : null"
    :aria-busy="loading ? 'true' : null"
    :tabindex="isDisabled ? -1 : null"
    class="app-button"
    :class="buttonClasses"
    v-bind="$attrs"
    @click.capture="guardInteraction"
  >
    <span
      v-if="loading"
      class="app-button__spinner"
      aria-hidden="true"
    />
    <span class="app-button__content">
      <slot />
    </span>
  </router-link>
  <a
    v-else-if="href"
    :href="isDisabled ? null : href"
    :aria-disabled="isDisabled ? 'true' : null"
    :aria-busy="loading ? 'true' : null"
    :tabindex="isDisabled ? -1 : null"
    class="app-button"
    :class="buttonClasses"
    v-bind="$attrs"
    @click.capture="guardInteraction"
  >
    <span
      v-if="loading"
      class="app-button__spinner"
      aria-hidden="true"
    />
    <span class="app-button__content">
      <slot />
    </span>
  </a>
  <button
    v-else
    :type="nativeType"
    class="app-button"
    :class="buttonClasses"
    :disabled="isDisabled"
    :aria-busy="loading ? 'true' : null"
    v-bind="$attrs"
  >
    <span
      v-if="loading"
      class="app-button__spinner"
      aria-hidden="true"
    />
    <span class="app-button__content">
      <slot />
    </span>
  </button>
</template>

<script>
export default {
  name: 'AppButton',
  inheritAttrs: false,
  props: {
    actionRole: {
      type: String,
      default: '',
      validator: value => ['', 'primary', 'secondary'].includes(value),
    },
    variant: {
      type: String,
      default: 'primary',
      validator: (value) => ['primary', 'secondary', 'danger', 'success', 'plain'].includes(value),
    },
    nativeType: {
      type: String,
      default: 'button',
    },
    to: {
      type: [String, Object],
      default: null,
    },
    href: {
      type: String,
      default: '',
    },
    loading: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    block: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    isDisabled() {
      return this.disabled || this.loading;
    },
    buttonClasses() {
      return {
        [`app-button--${this.variant}`]: true,
        'app-button--control': this.variant !== 'plain',
        'app-button--block': this.block,
        'app-button--loading': this.loading,
      };
    },
  },
  methods: {
    guardInteraction(event) {
      if (!this.isDisabled) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
    },
  },
};
</script>

<style scoped>
.app-button.app-button--control:not(.app-button--plain) {
  min-height: var(--app-control-height);
  height: auto;
  padding: var(--app-space-2) var(--app-space-4);
  border: 1px solid var(--button-border);
  border-radius: var(--app-radius-control);
  background: var(--button-background);
  color: var(--button-color);
  font-size: var(--app-font-base);
  font-weight: var(--app-weight-label);
  line-height: 22px;
  box-shadow: none;
  text-shadow: none;
}
.app-button--primary { --button-background: var(--app-primary); --button-border: var(--app-primary); --button-color: #fff; }
.app-button--secondary { --button-background: var(--app-surface); --button-border: var(--app-border); --button-color: var(--app-primary); }
.app-button--danger { --button-background: var(--app-danger); --button-border: var(--app-danger); --button-color: #fff; }
.app-button--success { --button-background: var(--app-success); --button-border: var(--app-success); --button-color: #fff; }
.app-button--control[aria-pressed="true"] { --button-background: var(--app-primary); --button-border: var(--app-primary); --button-color: #fff; }
.app-button--primary:hover { --button-background: var(--app-primary-dark); }
.app-button--secondary:hover { --button-background: var(--app-primary-soft); }
.app-button--danger:hover { --button-background: #B53232; }
.app-button--success:hover { --button-background: #116347; }
.app-button--primary:is(:disabled, [aria-disabled="true"]) { --button-background: #8abdcf; --button-border: #8abdcf; --button-color: #fff; opacity: 1; }
</style>
