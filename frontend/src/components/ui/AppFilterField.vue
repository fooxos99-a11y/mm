<template>
  <div class="app-filter-field">
    <label
      :id="forId ? `${forId}-label` : undefined"
      :for="forId"
      class="app-filter-field__label"
    >{{ label }}</label>
    <slot />
  </div>
</template>

<script>
export default {
  name: 'AppFilterField',
  props: {
    forId: { type: String, required: true },
    label: { type: String, required: true },
  },
};
</script>

<style>
.app-filter-field { display: grid; min-width: 0; gap: var(--app-space-2); }
.app-filter-field__label { display: block; margin: 0; color: var(--app-ui-text); font-size: var(--app-font-sm); font-weight: var(--app-weight-label); line-height: 1.5; }
.app-filter-field .app-select { width: 100%; min-width: 0; }
.app-filter-field .v-select__selection-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
