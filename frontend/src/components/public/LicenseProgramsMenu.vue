<template>
  <div
    ref="root"
    class="license-programs-menu"
  >
    <AppIconButton
      ref="toggle"
      variant="plain"
      class="licenses-menu-toggle public-header__action"
      aria-label="البرامج والرخص"
      :aria-expanded="String(open)"
      aria-haspopup="menu"
      :aria-controls="menuId"
      @click="toggleMenu"
      @keydown.esc.prevent="closeMenu(true)"
      @keydown.down.prevent="openMenu"
    >
      <svg
        viewBox="0 0 24 24"
        class="public-header__action-icon"
        aria-hidden="true"
      >
        <path
          d="M4 6h16M4 12h16M4 18h16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    </AppIconButton>

    <transition name="license-menu-fade">
      <div
        v-if="open"
        :id="menuId"
        class="licenses-menu"
        @keydown="handleMenuKeydown"
        @keydown.esc.prevent.stop="closeMenu(true)"
        @focusout="handleFocusOut"
      >
        <template v-if="title">
          <div class="licenses-menu-header">
            {{ title }}
          </div>
          <div class="licenses-menu__divider" />
        </template>
        <div
          role="menu"
          aria-label="البرامج والرخص"
        >
          <AppButton
            v-for="program in programs"
            :key="program.key"
            variant="plain"
            class="license-item"
            :class="{ 'license-item--current': program.key === currentKey }"
            role="menuitem"
            :aria-current="program.key === currentKey ? 'page' : undefined"
            :disabled="!program.available"
            @click="selectProgram(program)"
          >
            <AppSvgIcon
              :icon="program.available ? program.icon : 'mdi-lock-outline'"
              class="license-item__icon"
            />
            <span class="license-item__content">
              <strong>{{ program.title }}</strong>
              <small v-if="program.menuSubtitle">{{ program.menuSubtitle }}</small>
            </span>
            <AppSvgIcon
              v-if="program.key === currentKey"
              icon="mdi-check"
              class="license-item__current"
            />
          </AppButton>
        </div>
        <nav
          v-if="sectionLinks.length"
          class="licenses-menu__sections"
          aria-label="أقسام البرنامج"
        >
          <a
            v-for="item in sectionLinks"
            :key="item.href"
            :href="item.href"
            @click="closeMenu()"
          >{{ item.label }}</a>
        </nav>
      </div>
    </transition>
  </div>
</template>

<script>
import { useId } from 'vue';
import AppButton from '../ui/AppButton.vue';
import AppIconButton from '../ui/AppIconButton.vue';
import AppSvgIcon from '../ui/AppSvgIcon.vue';

export default {
  name: 'LicenseProgramsMenu',
  components: { AppButton, AppIconButton, AppSvgIcon },
  props: {
    title: { type: String, default: '' },
    programs: { type: Array, default: () => [] },
    currentKey: { type: String, default: '' },
    sectionLinks: { type: Array, default: () => [] },
  },
  emits: ['select', 'open'],
  setup() {
    return { menuId: `license-programs-menu-${useId()}` };
  },
  data() {
    return { open: false };
  },
  watch: {
    '$route.fullPath'() { this.closeMenu(); },
  },
  mounted() {
    document.addEventListener('click', this.handleOutsideClick);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleOutsideClick);
  },
  methods: {
    toggleMenu() {
      if (this.open) this.closeMenu();
      else this.openMenu();
    },
    openMenu() {
      this.open = true;
      this.$emit('open');
      this.$nextTick(() => this.$el.querySelector('[role="menuitem"]:not(:disabled)')?.focus());
    },
    closeMenu(restoreFocus = false) {
      if (!this.open) return;
      this.open = false;
      if (restoreFocus) this.$nextTick(() => this.$refs.toggle?.$el?.focus());
    },
    handleOutsideClick(event) {
      if (this.open && !this.$refs.root.contains(event.target)) this.closeMenu();
    },
    handleFocusOut(event) {
      if (!this.$refs.root.contains(event.relatedTarget)) this.closeMenu();
    },
    handleMenuKeydown(event) {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const items = [...this.$el.querySelectorAll('[role="menuitem"]:not(:disabled), .licenses-menu__sections a')]
        .filter((item) => item.getClientRects().length);
      const index = items.indexOf(document.activeElement);
      const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
        : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[nextIndex]?.focus();
    },
    selectProgram(program) {
      if (!program.available) return;
      this.closeMenu(true);
      this.$emit('select', program);
    },
  },
};
</script>

<style scoped>
.license-programs-menu { position: relative; }
.licenses-menu-toggle { width: 44px; height: 44px; color: inherit; border-radius: 10px; }
.licenses-menu-toggle svg { display: block; width: 24px; height: 24px; }
.licenses-menu-toggle:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }
.licenses-menu {
  position: absolute;
  z-index: 20;
  top: calc(100% + 12px);
  inset-inline-end: 0;
  width: min(300px, calc(100vw - 32px));
  max-height: calc(100dvh - 88px);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 6px;
  box-sizing: border-box;
  border: 1px solid rgba(8, 56, 74, 0.12);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 18px 50px rgba(8, 56, 74, 0.18);
}
.licenses-menu-header { padding: 10px 12px; color: #173f4d; font-weight: 700; }
.licenses-menu__divider { height: 1px; background: #edf4f5; }
.license-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 48px;
  padding: 10px 12px;
  box-sizing: border-box;
  border: 0;
  background: transparent;
  color: #173f4d;
  font: inherit;
  text-align: start;
  border-radius: 8px;
  cursor: pointer;
}
.license-item:hover:not(:disabled) { background: #f1fafb; }
.license-item:focus-visible { outline: 2px solid #237a93; outline-offset: -2px; }
.license-item.license-item--current { background: #eaf5f8; color: #0d617a; }
.license-item:disabled { color: #6b7f87; opacity: 1; cursor: not-allowed; }
.license-item :deep(.app-button__content) { width: 100%; justify-content: flex-start; gap: 10px; white-space: normal; }
.license-item__icon { flex: 0 0 auto; width: 20px; height: 20px; color: #237a93; }
.license-item:disabled .license-item__icon { color: #6b7f87; }
.license-item__content { display: grid; gap: 2px; min-width: 0; overflow-wrap: anywhere; }
.license-item__content strong { font-size: 0.96rem; }
.license-item__content small { color: #58717c; font-size: 0.78rem; }
.license-item__current { flex: 0 0 18px; width: 18px; height: 18px; margin-inline-start: auto; }
.licenses-menu__sections { display: grid; border-top: 1px solid #e2edf0; margin-top: 6px; padding-top: 6px; }
.licenses-menu__sections a { display: flex; align-items: center; min-height: 44px; padding: 8px 12px; border-radius: 8px; color: #173f4d; font-size: 0.9rem; font-weight: 700; text-decoration: none; }
.licenses-menu__sections a:hover { background: #f1fafb; }
.licenses-menu__sections a:focus-visible { outline: 2px solid #237a93; outline-offset: -2px; }
.license-menu-fade-enter-active, .license-menu-fade-leave-active { transition: opacity 140ms ease, transform 140ms ease; }
.license-menu-fade-enter-from, .license-menu-fade-leave-to { opacity: 0; transform: translateY(-6px); }
@media (prefers-reduced-motion: reduce) {
  .license-menu-fade-enter-active, .license-menu-fade-leave-active { transition: none; }
}
@media (min-width: 640px) {
  .licenses-menu { max-height: calc(100dvh - 100px); }
}
@media (min-width: 1200px) {
  .licenses-menu__sections { display: none; }
}
</style>
