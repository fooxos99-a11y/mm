<template>
  <section class="app-state app-state--empty">
    <v-icon
      v-if="icon"
      class="app-state__icon"
      size="38"
    >
      {{ icon }}
    </v-icon>
    <h3 class="app-state__title">
      {{ title }}
    </h3>
    <p
      v-if="description"
      class="app-state__description"
    >
      {{ description }}
    </p>
    <div
      v-if="$slots.default"
      class="app-state__action"
    >
      <slot />
    </div>
  </section>
</template>

<script>
export default {
  name: 'AppEmptyState',
  props: {
    title: { type: String, default: 'لا توجد بيانات' },
    description: { type: String, default: '' },
    icon: { type: String, default: 'mdi-inbox-outline' },
  },
};
</script>
