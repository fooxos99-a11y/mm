<template>
  <AppActionBar
    class="app-dialog-footer"
  >
    <slot />
  </AppActionBar>
</template>

<script>
import AppActionBar from './AppActionBar.vue';

export default {
  name: 'AppDialogFooter',
  components: { AppActionBar },
};
</script>
