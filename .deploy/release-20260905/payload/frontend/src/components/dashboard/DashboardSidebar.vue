<template>
  <div class="dashboard-sidebar-shell">
    <aside
      class="dashboard-sidebar"
      :class="{ 'dashboard-sidebar--open': open }"
    >
      <router-link
        :to="{ name: 'practitioner' }"
        class="dashboard-sidebar__brand"
      >
        <img
          :src="$publicAsset('اللوقو-شفاف.webp')"
          alt="شعار البرنامج"
          class="dashboard-sidebar__logo"
        >
        <div class="dashboard-sidebar__title">
          لوحة التحكم
        </div>
      </router-link>
      <nav class="dashboard-nav">
        <template
          v-for="item in items"
          :key="item.id"
        >
          <div
            v-if="item.dividerBefore"
            class="dashboard-nav__divider"
          />
          <div
            class="dashboard-nav__entry"
          >
            <AppButton
              variant="plain"
              class="dashboard-nav__item"
              :class="{ 'dashboard-nav__item--active': isActive(item) }"
              :disabled="loading"
              @click="$emit('select', item)"
            >
              <span class="dashboard-nav__copy">
                <span class="dashboard-nav__icon"><v-icon small>{{ item.icon }}</v-icon></span>
                <span class="dashboard-nav__label">{{ item.label }}</span>
                <span
                  v-if="item.id === 'settings'"
                  class="dashboard-nav__chevron"
                  :class="{ 'dashboard-nav__chevron--open': settingsOpen }"
                ><v-icon small>mdi-chevron-down</v-icon></span>
              </span>
              <span
                v-if="item.id !== 'settings'"
                class="dashboard-nav__dot"
              />
            </AppButton>
            <div
              v-if="item.id === 'settings' && settingsOpen && settingsItems.length"
              class="dashboard-subnav"
            >
              <AppButton
                v-for="setting in settingsItems"
                :key="setting.id"
                variant="plain"
                class="dashboard-nav__item dashboard-subnav__item"
                :class="{
                  'dashboard-nav__item--active': selectedSetting === setting.id && activeMenu === 'settings',
                  'dashboard-subnav__item--active': selectedSetting === setting.id && activeMenu === 'settings',
                }"
                :disabled="loading"
                @click="$emit('select-setting', setting.id)"
              >
                <span class="dashboard-nav__copy dashboard-subnav__copy">
                  <span class="dashboard-nav__icon dashboard-subnav__icon"><v-icon small>{{ setting.icon }}</v-icon></span>
                  <span class="dashboard-nav__label dashboard-subnav__label">{{ setting.label }}</span>
                </span>
                <span class="dashboard-nav__dot dashboard-subnav__dot" />
              </AppButton>
            </div>
          </div>
        </template>
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
import { AppButton } from '../ui';

export default {
  name: 'DashboardSidebar',
  components: { AppButton },
  props: {
    open: Boolean,
    items: { type: Array, default: () => [] },
    loading: Boolean,
    settingsOpen: Boolean,
    settingsItems: { type: Array, default: () => [] },
    selectedSetting: { type: String, default: '' },
    activeMenu: { type: String, default: '' },
    isActive: { type: Function, required: true },
  },
};
</script>

<style scoped>
.dashboard-sidebar-shell { display: contents; }
</style>
