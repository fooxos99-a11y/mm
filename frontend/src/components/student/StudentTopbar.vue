<template>
  <header class="dashboard-topbar">
    <div class="dashboard-topbar__mobile">
      <AppIconButton
        variant="primary"
        class="dashboard-icon-button"
        aria-label="فتح القائمة"
        @click="$emit('toggle-menu')"
      >
        <v-icon>{{ menuOpen ? 'mdi-close' : 'mdi-menu' }}</v-icon>
      </AppIconButton>
    </div>
    <div class="dashboard-topbar__welcome">
      <div class="dashboard-topbar__label">
        مرحبًا
      </div>
      <div class="dashboard-topbar__name">
        {{ studentName || 'الطالب' }}
      </div>
    </div>
  </header>
</template>

<script>
import AppIconButton from '../AppIconButton.vue';

export default {
  name: 'StudentTopbar',
  components: { AppIconButton },
  props: {
    menuOpen: Boolean,
    studentName: { type: String, default: '' },
  },
  emits: ['toggle-menu'],
};
</script>
