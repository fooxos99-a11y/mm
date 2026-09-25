<template>
  <div class="student-navigation">
    <aside
      class="dashboard-sidebar"
      :class="{ 'dashboard-sidebar--open': open }"
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
    </aside>
    <div
      v-if="open"
      class="dashboard-backdrop"
      @click="$emit('close')"
    />
  </div>
</template>

<script>
import { AppRawButton } from '../ui';

export default {
  name: 'StudentNavigation',
  components: { AppRawButton },
  props: {
    open: Boolean,
    items: { type: Array, default: () => [] },
    activeSection: { type: String, default: '' },
  },
};
</script>

<style scoped>
.student-navigation { display: contents; }
</style>
