<template>
  <aside
    class="app-sidebar"
    :class="{ 'app-sidebar--collapsed': collapsed }"
  >
    <div
      v-if="$slots.header"
      class="app-sidebar__header"
    >
      <slot name="header" />
    </div>
    <nav class="app-sidebar__nav">
      <slot />
    </nav>
    <div
      v-if="$slots.footer"
      class="app-sidebar__footer"
    >
      <slot name="footer" />
    </div>
  </aside>
</template>

<script>
export default {
  name: 'AppSidebar',
  props: { collapsed: { type: Boolean, default: false } },
};
</script>
