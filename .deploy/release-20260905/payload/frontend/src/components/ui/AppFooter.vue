<template>
  <footer class="app-layout-footer">
    <div class="app-layout-footer__inner">
      <div><slot /></div>
      <div
        v-if="$slots.actions"
        class="app-layout-footer__actions"
      >
        <slot name="actions" />
      </div>
    </div>
  </footer>
</template>

<script>
export default { name: 'AppFooter' };
</script>
