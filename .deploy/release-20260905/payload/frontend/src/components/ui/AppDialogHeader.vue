<template>
  <div class="app-dialog-header">
    <div class="app-dialog-header__main">
      <div
        v-if="eyebrow"
        class="app-dialog-header__eyebrow"
      >
        {{ eyebrow }}
      </div>
      <component
        :is="titleTag"
        v-if="title"
        class="app-dialog-header__title"
      >
        {{ title }}
      </component>
      <div
        v-if="$slots.default"
        class="app-dialog-header__extra"
      >
        <slot />
      </div>
    </div>

    <div
      v-if="$slots.actions || closable"
      class="app-dialog-header__actions"
    >
      <slot name="actions" />
      <button
        v-if="closable"
        type="button"
        class="app-dialog-close"
        @click="$emit('close')"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AppDialogHeader',
  props: {
    title: {
      type: String,
      default: '',
    },
    eyebrow: {
      type: String,
      default: '',
    },
    titleTag: {
      type: String,
      default: 'div',
    },
    closable: {
      type: Boolean,
      default: false,
    },
  },
};
</script>
