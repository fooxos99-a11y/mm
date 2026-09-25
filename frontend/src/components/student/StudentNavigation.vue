<template>
  <AppMobileSidebar
    class="student-navigation"
    :open="open"
    label="قائمة حسابي"
    @close="$emit('close')"
  >
    <router-link
      :to="{ name: 'home' }"
      class="dashboard-sidebar__brand"
    >
      <img
        :src="$publicAsset('اللوقو-شفاف.webp')"
        alt="شعار البرنامج"
        class="dashboard-sidebar__logo"
      >
      <div class="dashboard-sidebar__title">
        حسابي
      </div>
    </router-link>
    <nav class="dashboard-nav">
      <div
        v-for="item in items"
        :key="item.id"
        class="dashboard-nav__entry"
      >
        <AppRawButton
          type="button"
          class="dashboard-nav__item"
          :class="{ 'dashboard-nav__item--active': activeSection === item.id }"
          @click="$emit('select', item.id)"
        >
          <span class="dashboard-nav__copy">
            <span class="dashboard-nav__icon"><v-icon small>{{ item.icon }}</v-icon></span>
            <span class="dashboard-nav__label">{{ item.label }}</span>
          </span>
          <span class="dashboard-nav__dot" />
        </AppRawButton>
      </div>
    </nav>
  </AppMobileSidebar>
</template>

<script>
import { AppRawButton } from '../ui';
import AppMobileSidebar from '../ui/AppMobileSidebar.vue';

export default {
  name: 'StudentNavigation',
  components: { AppRawButton, AppMobileSidebar },
  props: {
    open: Boolean,
    items: { type: Array, default: () => [] },
    activeSection: { type: String, default: '' },
  },
  emits: ['close', 'select'],
};
</script>
