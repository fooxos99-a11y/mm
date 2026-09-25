<template>
  <transition name="app-drawer">
    <div
      v-if="isOpen"
      class="app-drawer-layer"
    >
      <button
        class="app-drawer__backdrop"
        type="button"
        aria-label="إغلاق"
        @click="close"
      />
      <aside
        ref="drawer"
        class="app-drawer"
        :class="`app-drawer--${side}`"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        :aria-labelledby="title ? drawerTitleId : null"
        :aria-label="title ? null : 'القائمة الجانبية'"
      >
        <header class="app-drawer__header">
          <h2
            v-if="title"
            :id="drawerTitleId"
          >
            {{ title }}
          </h2>
          <AppIconButton
            aria-label="إغلاق"
            variant="neutral"
            @click="close"
          >
            <v-icon size="20">
              mdi-close
            </v-icon>
          </AppIconButton>
        </header>
        <div class="app-drawer__body">
          <slot />
        </div>
        <footer
          v-if="$slots.footer"
          class="app-drawer__footer"
        >
          <slot name="footer" />
        </footer>
      </aside>
    </div>
  </transition>
</template>

<script>
import AppIconButton from './AppIconButton.vue';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export default {
  name: 'AppDrawer',
  components: { AppIconButton },
  props: {
    modelValue: { type: Boolean, default: undefined },
    value: { type: Boolean, default: false },
    title: { type: String, default: '' },
    side: { type: String, default: 'right', validator: (value) => ['right', 'left'].includes(value) },
  },
  emits: ['update:modelValue', 'input', 'close'],
  data() {
    return {
      focusManagementActive: false,
      previouslyFocusedElement: null,
    };
  },
  computed: {
    isOpen() {
      return this.modelValue !== undefined ? this.modelValue : this.value;
    },
    drawerTitleId() {
      return `app-drawer-title-${this._uid}`;
    },
  },
  watch: {
    isOpen(isOpen) {
      if (isOpen) {
        this.$nextTick(this.activateDrawer);
        return;
      }

      this.deactivateDrawer();
    },
  },
  mounted() {
    if (this.isOpen) {
      this.$nextTick(this.activateDrawer);
    }
  },
  beforeUnmount() {
    this.deactivateDrawer();
  },
  methods: {
    activateDrawer() {
      if (this.focusManagementActive || typeof document === 'undefined') {
        return;
      }

      const drawer = this.$refs.drawer;
      if (!drawer) {
        return;
      }

      const activeElement = document.activeElement;
      this.previouslyFocusedElement = activeElement && activeElement !== document.body
        ? activeElement
        : null;
      this.focusManagementActive = true;
      document.addEventListener('keydown', this.handleDocumentKeydown, true);

      const [firstFocusableElement] = this.getFocusableElements();
      (firstFocusableElement || drawer).focus();
    },
    deactivateDrawer() {
      if (typeof document === 'undefined') {
        return;
      }

      document.removeEventListener('keydown', this.handleDocumentKeydown, true);
      this.focusManagementActive = false;

      const focusTarget = this.previouslyFocusedElement;
      this.previouslyFocusedElement = null;

      if (focusTarget && typeof focusTarget.focus === 'function' && document.contains(focusTarget)) {
        focusTarget.focus();
      }
    },
    getFocusableElements() {
      const drawer = this.$refs.drawer;
      return drawer ? Array.from(drawer.querySelectorAll(FOCUSABLE_SELECTOR)) : [];
    },
    handleDocumentKeydown(event) {
      if (!this.isOpen) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        this.close();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const drawer = this.$refs.drawer;
      if (!drawer) {
        return;
      }

      const focusableElements = this.getFocusableElements();
      if (!focusableElements.length) {
        event.preventDefault();
        drawer.focus();
        return;
      }

      const firstFocusableElement = focusableElements[0];
      const lastFocusableElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;
      const focusStartsOutside = activeElement === drawer || !drawer.contains(activeElement);

      if (event.shiftKey && (activeElement === firstFocusableElement || focusStartsOutside)) {
        event.preventDefault();
        lastFocusableElement.focus();
      } else if (!event.shiftKey && (activeElement === lastFocusableElement || focusStartsOutside)) {
        event.preventDefault();
        firstFocusableElement.focus();
      }
    },
    close() {
      this.$emit('update:modelValue', false);
      this.$emit('input', false);
      this.$emit('close');
    },
  },
};
</script>
