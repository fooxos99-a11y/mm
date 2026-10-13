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
        :tabindex="initialFocus ? -1 : undefined"
        :autofocus="initialFocus || undefined"
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
      <AppIconButton
        v-if="closable"
        size="sm"
        class="app-dialog-close"
        label="إغلاق"
        :disabled="closeDisabled"
        @click="$emit('close')"
      >
        <span aria-hidden="true">×</span>
      </AppIconButton>
    </div>
  </div>
</template>

<script>
import AppIconButton from './AppIconButton.vue';

export default {
  name: 'AppDialogHeader',
  components: { AppIconButton },
  props: {
    closeDisabled: { type: Boolean, default: false },
    initialFocus: { type: Boolean, default: false },
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
  emits: ['close'],
};
</script>
