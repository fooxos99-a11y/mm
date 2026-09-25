<template>
  <component
    :is="tag"
    class="app-card"
    :class="{ 'app-card--interactive': interactive, 'app-card--flat': flat }"
  >
    <header
      v-if="$slots.header || title"
      class="app-card__header"
    >
      <slot name="header">
        <h3 class="app-card__title">
          {{ title }}
        </h3>
      </slot>
    </header>
    <div class="app-card__body">
      <slot />
    </div>
    <footer
      v-if="$slots.footer"
      class="app-card__footer"
    >
      <slot name="footer" />
    </footer>
  </component>
</template>

<script>
export default {
  name: 'AppCard',
  props: {
    tag: { type: String, default: 'section' },
    title: { type: String, default: '' },
    interactive: { type: Boolean, default: false },
    flat: { type: Boolean, default: false },
  },
};
</script>
