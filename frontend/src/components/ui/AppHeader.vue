<template>
  <header class="app-layout-header">
    <div class="app-layout-header__inner">
      <div class="app-layout-header__brand">
        <slot name="brand" />
      </div>
      <nav
        v-if="$slots.default"
        class="app-layout-header__nav"
      >
        <slot />
      </nav>
      <div
        v-if="$slots.actions"
        class="app-layout-header__actions"
      >
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>

<script>
export default { name: 'AppHeader' };
</script>
