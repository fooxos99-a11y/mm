<template>
  <div
    ref="root"
    class="license-programs-menu"
  >
    <AppIconButton
      ref="toggle"
      variant="plain"
      class="licenses-menu-toggle"
      aria-label="البرامج والرخص"
      :aria-expanded="String(open)"
      aria-haspopup="menu"
      :aria-controls="menuId"
      @click="toggleMenu"
      @keydown.esc.prevent="closeMenu(true)"
    >
      <span
        class="licenses-menu-toggle__bars"
        aria-hidden="true"
      >
        <span class="licenses-menu-toggle__bar" />
        <span class="licenses-menu-toggle__bar" />
        <span class="licenses-menu-toggle__bar" />
      </span>
    </AppIconButton>

    <transition name="license-menu-fade">
      <div
        v-if="open"
        :id="menuId"
        class="licenses-menu"
        role="menu"
        @keydown.esc.prevent.stop="closeMenu(true)"
      >
        <template v-if="title">
          <div class="licenses-menu-header">
            {{ title }}
          </div>
          <div class="licenses-menu__divider" />
        </template>
        <button
          v-for="program in programs"
          :key="program.key"
          class="license-item"
          type="button"
          role="menuitem"
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
        </button>
      </div>
    </transition>
  </div>
</template>

<script>
import AppIconButton from '../ui/AppIconButton.vue';
import AppSvgIcon from '../ui/AppSvgIcon.vue';

export default {
  name: 'LicenseProgramsMenu',
  components: { AppIconButton, AppSvgIcon },
  props: {
    title: { type: String, default: '' },
    programs: { type: Array, default: () => [] },
  },
  emits: ['select'],
  data() {
    return { open: false };
  },
  computed: {
    menuId() {
      return `license-programs-menu-${this._uid}`;
    },
  },
  mounted() {
    document.addEventListener('click', this.handleOutsideClick);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleOutsideClick);
  },
  methods: {
    toggleMenu() {
      this.open = !this.open;
      if (this.open) {
        this.$nextTick(() => this.$el.querySelector('[role="menuitem"]:not(:disabled)')?.focus());
      }
    },
    closeMenu(restoreFocus = false) {
      if (!this.open) return;
      this.open = false;
      if (restoreFocus) this.$nextTick(() => this.$refs.toggle?.$el?.focus());
    },
    handleOutsideClick(event) {
      if (this.open && !this.$refs.root.contains(event.target)) this.closeMenu();
    },
    selectProgram(program) {
      if (!program.available) return;
      this.closeMenu();
      this.$emit('select', program);
    },
  },
};
</script>

<style scoped>
.license-programs-menu { position: relative; }
.licenses-menu {
  position: absolute;
  z-index: 20;
  top: calc(100% + 18px);
  inset-inline-end: 0;
  width: min(300px, calc(100vw - 32px));
  overflow: hidden;
  border: 1px solid rgba(8, 56, 74, 0.12);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 18px 50px rgba(8, 56, 74, 0.18);
}
.licenses-menu-header { padding: 16px 18px; }
.licenses-menu__divider { height: 1px; background: #edf4f5; }
.license-item {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  min-height: 58px;
  padding: 10px 18px;
  border: 0;
  background: transparent;
  color: #173f4d;
  font: inherit;
  text-align: start;
  cursor: pointer;
}
.license-item:hover:not(:disabled), .license-item:focus-visible { background: #f1fafb; outline: none; }
.license-item:disabled { color: #8da1a8; cursor: not-allowed; }
.license-item__icon { flex: 0 0 auto; width: 23px; height: 23px; color: #2a94b2; }
.license-item:disabled .license-item__icon { color: #8da1a8; }
.license-item__content { display: grid; gap: 2px; }
.license-item__content strong { font-size: 0.96rem; }
.license-item__content small { color: #6b8791; font-size: 0.78rem; }
.license-menu-fade-enter-active, .license-menu-fade-leave-active { transition: opacity 140ms ease, transform 140ms ease; }
.license-menu-fade-enter, .license-menu-fade-leave-to { opacity: 0; transform: translateY(-6px); }
@media (prefers-reduced-motion: reduce) {
  .license-menu-fade-enter-active, .license-menu-fade-leave-active { transition: none; }
}
@media (max-width: 720px) {
  .license-programs-menu > .licenses-menu {
    position: fixed;
    top: 95px;
    right: 16px !important;
    left: 16px !important;
    width: auto !important;
    max-width: none !important;
  }
}
</style>
