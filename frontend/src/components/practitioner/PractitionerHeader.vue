<template>
  <PublicLandingHeader
    ref="header"
    :brand-title="pageContent.brandTitle"
    :scrolled="scrolled"
    :programs="licensePrograms"
    :section-links="pageNavItems"
    current-key="practitioner"
    program-logo
    @open-program="$emit('open-program', $event)"
    @menu-open="$emit('close-account')"
  >
    <template #account>
      <div
        class="account-menu account-menu--header"
        @click.stop
        @keydown.stop
      >
        <AppIconButton
          variant="plain"
          class="public-header__action"
          :aria-label="isAuthenticated ? 'الحساب' : 'التسجيل'"
          @click="handleAccountClick"
        >
          <svg
            viewBox="0 0 24 24"
            class="public-header__action-icon"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="8"
              r="3.25"
              fill="none"
              stroke="currentColor"
              stroke-width="1.9"
            />
            <path
              d="M6.75 18.25c0-2.7 2.35-4.75 5.25-4.75s5.25 2.05 5.25 4.75"
              fill="none"
              stroke="currentColor"
              stroke-width="1.9"
              stroke-linecap="round"
            />
          </svg>
        </AppIconButton>

        <transition name="mobile-menu-fade">
          <div
            v-if="accountMenuOpen && isAuthenticated"
            class="account-menu__panel account-menu__panel--header"
          >
            <AppButton
              variant="plain"
              class="account-menu__name"
              @click="$emit('open-profile')"
            >
              {{ profileName }}
            </AppButton>
            <AppButton
              v-for="item in accountMenuItems"
              :key="item.key"
              variant="plain"
              class="account-menu__item"
              :class="{
                'account-menu__item--danger': item.danger,
                'account-menu__item--disabled': item.disabled,
              }"
              :disabled="item.disabled"
              @click="$emit('account-menu-action', item)"
            >
              {{ item.label }}
            </AppButton>
            <StudentAttendanceMenu v-if="$store.state.currentUser?.role === 'student'" />
          </div>
        </transition>
      </div>
    </template>
  </PublicLandingHeader>
</template>

<script>
import { AppButton, AppIconButton } from '../ui';
import PublicLandingHeader from '../public/PublicLandingHeader.vue';
import StudentAttendanceMenu from '../student/StudentAttendanceMenu.vue';

export default {
  name: 'PractitionerHeader',
  components: { AppButton, AppIconButton, PublicLandingHeader, StudentAttendanceMenu },
  props: {
    pageContent: { type: Object, required: true },
    scrolled: { type: Boolean, default: false },
    pageNavItems: { type: Array, default: () => [] },
    isAuthenticated: { type: Boolean, default: false },
    accountMenuOpen: { type: Boolean, default: false },
    profileName: { type: String, default: '' },
    accountMenuItems: { type: Array, default: () => [] },
    licensePrograms: { type: Array, default: () => [] },
  },
  emits: ['account-click', 'account-menu-action', 'open-profile', 'open-program', 'close-account'],
  methods: {
    handleAccountClick() {
      this.$refs.header.closeMenu();
      this.$emit('account-click');
    },
  },
};
</script>

<style scoped>
.account-menu__panel.account-menu__panel--header {
  top: calc(100% + 12px);
  right: auto;
  left: 0;
  width: min(260px, calc(100vw - 96px));
  max-height: calc(100dvh - 96px);
  overflow-y: auto;
  padding: 12px 16px;
  border: 1px solid #dce9ed;
  border-radius: 14px;
  background: #fff;
}
.account-menu__panel--header .account-menu__name,
.account-menu__panel--header .account-menu__item { min-height: 44px; padding: 8px 0; font-size: 0.94rem; }
.account-menu__panel--header .account-menu__name:focus-visible,
.account-menu__panel--header .account-menu__item:focus-visible { outline: 2px solid #237a93; outline-offset: 2px; }
</style>
