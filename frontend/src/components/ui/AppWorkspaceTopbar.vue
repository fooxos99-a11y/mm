<template>
  <header class="dashboard-topbar">
    <div class="dashboard-topbar__mobile">
      <AppIconButton
        variant="plain"
        class="dashboard-icon-button"
        aria-label="فتح القائمة"
        :aria-expanded="menuOpen"
        @click="$emit('toggle-menu')"
      >
        <v-icon>mdi-menu</v-icon>
      </AppIconButton>
    </div>
    <div class="dashboard-topbar__welcome">
      <component
        :is="title ? 'h1' : 'div'"
        class="dashboard-topbar__label"
      >
        {{ title || 'مرحبًا' }}
      </component>
      <div class="dashboard-topbar__name">
        {{ adminName }}
      </div>
    </div>
    <slot />
  </header>
</template>

<script>
import AppIconButton from './AppIconButton.vue';

export default {
  name: 'AppWorkspaceTopbar',
  components: { AppIconButton },
  props: {
    adminName: { type: String, default: '' },
    title: { type: String, default: '' },
    menuOpen: Boolean,
  },
  emits: ['toggle-menu'],
};
</script>

<style scoped>
.dashboard-topbar__label { margin: 0; }
</style>
