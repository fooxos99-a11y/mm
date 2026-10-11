<template>
  <div class="app-filter-field">
    <label
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
.app-filter-field { display: grid; min-width: 0; gap: 8px; }
.app-filter-field__label { display: block; margin: 0; color: #123f56; font-size: .95rem; font-weight: 800; line-height: 1.5; }
.app-filter-field .app-select { width: 100%; min-width: 0; }
.app-filter-field .v-field { border-radius: 12px; }
.app-filter-field .v-field__input { min-height: 58px; padding-top: 12px; padding-bottom: 12px; }
.app-filter-field .v-select__selection-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
