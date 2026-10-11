<template>
  <div
    class="app-filter-toolbar"
    :class="{ 'app-filter-toolbar--single': columns === 1, 'app-filter-toolbar--three': columns === 3, 'app-filter-toolbar--four': columns === 4 }"
  >
    <slot />
  </div>
</template>

<script>
export default {
  name: 'AppFilterToolbar',
  props: { columns: { type: Number, default: 2 } },
};
</script>

<style>
.app-filter-toolbar {
  display: grid;
  --app-filter-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  grid-template-columns: var(--app-filter-columns);
  align-items: end;
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e6edf3;
}
.app-filter-toolbar--single { --app-filter-columns: minmax(0, 1fr); }
@media (min-width: 768px) {
  .app-filter-toolbar--three { --app-filter-columns: minmax(0, 1.4fr) repeat(2, minmax(0, 1fr)); }
  .app-filter-toolbar--four { --app-filter-columns: minmax(0, 1.4fr) repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 767px) {
  .app-filter-toolbar--three > :first-child { grid-column: 1 / -1; }
}
@media (max-width: 359px) {
  .app-filter-toolbar { --app-filter-columns: minmax(0, 1fr); }
}
</style>
