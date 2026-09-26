<template>
  <header
    class="landing-header"
    :class="{ 'landing-header--scrolled': scrolled }"
  >
    <div class="landing-shell landing-header__inner">
      <a
        href="#home"
        class="brand-mark"
      >
        <div class="brand-mark__logos">
          <img
            :src="$publicAsset('شعار-الجمعية.webp')"
            alt="شعار الجمعية"
            class="site-logo"
            :class="scrolled ? 'site-logo--scrolled' : 'site-logo--top'"
          >
          <img
            :src="$publicAsset('اللوقو-شفاف.webp')"
            alt="شعار برنامج رخصة ممارس"
            class="site-logo"
            :class="scrolled ? 'site-logo--scrolled' : 'site-logo--top'"
          >
        </div>
        <div
          class="brand-mark__text"
          :class="{ 'brand-mark__text--light': !scrolled }"
        >
          <div class="brand-mark__title">{{ pageContent.brandTitle }}</div>
        </div>
      </a>

      <nav class="landing-nav">
        <a
          v-for="item in pageNavItems"
          :key="item.href"
          :href="item.href"
        >{{ item.label }}</a>
      </nav>

      <div class="landing-header__actions">
        <div
          class="account-menu account-menu--header"
          @click.stop
          @keydown.stop
        >
          <AppIconButton
            variant="plain"
            class="header-icon-link"
            :aria-label="isAuthenticated ? 'الحساب' : 'التسجيل'"
            @click="$emit('account-click')"
          >
            <svg
              viewBox="0 0 24 24"
              class="header-icon-svg"
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
            </div>
          </transition>
        </div>

        <LicenseProgramsMenu
          :programs="licensePrograms"
          @select="$emit('open-program', $event)"
        />
      </div>
    </div>
  </header>
</template>

<script>
import { AppButton, AppIconButton } from '../ui';
import LicenseProgramsMenu from '../public/LicenseProgramsMenu.vue';

export default {
  name: 'PractitionerHeader',
  components: { AppButton, AppIconButton, LicenseProgramsMenu },
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
  emits: ['account-click', 'account-menu-action', 'open-profile', 'open-program'],
};
</script>
