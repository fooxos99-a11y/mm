<template>
  <AppCard
    tag="article"
    class="app-settings-panel admin-workspace-card"
  >
    <header class="app-settings-panel__header">
      <h1>{{ title }}</h1>
      <slot name="actions" />
    </header>
    <AppFilterToolbar
      v-if="$slots.filters"
      :columns="2"
      class="app-settings-panel__toolbar"
    >
      <slot name="filters" />
    </AppFilterToolbar>
    <slot />
  </AppCard>
</template>

<script>
import AppCard from './AppCard.vue';
import AppFilterToolbar from './AppFilterToolbar.vue';

export default {
  name: 'AppSettingsPanel',
  components: { AppCard, AppFilterToolbar },
  props: { title: { type: String, required: true } },
};
</script>

<style>
.app-settings-panel { width: 100%; overflow: visible; }
.app-settings-panel__header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
.app-settings-panel__header h1 { margin: 0; font-size: var(--app-font-title); color: var(--app-primary-dark); }
.app-settings-panel__toolbar .app-filter-field { min-width: 0; }
@media (max-width: 1199px) { .app-settings-panel__toolbar { --app-filter-columns: repeat(2, minmax(0, 1fr)); gap: 12px; } }
@media (max-width: 599px) { .app-settings-panel__toolbar { --app-filter-columns: minmax(0, 1fr); } }
</style>
