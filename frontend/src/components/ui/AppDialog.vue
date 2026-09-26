<template>
  <dialog
    ref="dialog"
    class="modal"
    :class="{ 'modal--scrollable': scrollable }"
    :style="dialogStyle"
    @cancel="handleNativeClose"
    @close="handleNativeClose"
    @click="handleBackdropClick"
    @keydown.esc="handleEscapeKey"
  >
    <div
      class="modal-box"
      :style="boxStyle"
    >
      <slot />
    </div>
  </dialog>
</template>

<script>
import { lockPageScroll } from '../../utils/pageScrollLock';
import { observeOverlayViewport } from '../../utils/overlayViewport';

export default {
  name: 'AppDialog',
  props: {
    modelValue: {
      type: Boolean,
      default: undefined,
    },
    value: {
      type: Boolean,
      default: false,
    },
    maxWidth: {
      type: [String, Number],
      default: '620',
    },
    scrollable: {
      type: Boolean,
      default: false,
    },
    closeOnBackdrop: {
      type: Boolean,
      default: true,
    },
    persistent: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue', 'input', 'close'],
  computed: {
    isOpen() {
      return this.modelValue !== undefined ? this.modelValue : this.value;
    },
    normalizedMaxWidth() {
      if (typeof this.maxWidth === 'number') {
        return `${this.maxWidth}px`;
      }

      const value = String(this.maxWidth || '').trim();

      if (!value) {
        return '620px';
      }

      return /^\d+$/.test(value) ? `${value}px` : value;
    },
    dialogStyle() {
      return {
        '--modal-box-max-width': this.normalizedMaxWidth,
      };
    },
    boxStyle() {
      return {
        maxWidth: 'var(--modal-box-max-width)',
      };
    },
  },
  watch: {
    isOpen: {
      immediate: true,
      handler(nextValue) {
        this.syncState(nextValue);
      },
    },
  },
  mounted() {
    this.syncState(this.isOpen);
  },
  beforeUnmount() {
    this.stopViewport?.();
    this.releaseScrollLock?.();
  },
  methods: {
    syncState(isOpen) {
      const dialog = this.$refs.dialog;

      if (!dialog) {
        return;
      }

      if (isOpen && !dialog.open) {
        this.stopViewport = observeOverlayViewport(dialog);
        if (!this.$attrs['aria-label'] && !this.$attrs['aria-labelledby']) {
          const title = dialog.querySelector('.app-dialog-header__title, .app-dialog__title, h1, h2, h3');
          dialog.setAttribute('aria-label', title?.textContent?.trim() || 'نافذة');
        }
        this.releaseScrollLock = lockPageScroll();
        dialog.showModal();
        return;
      }

      if (!isOpen && dialog.open) {
        this.stopViewport?.();
        this.releaseScrollLock?.();
        this.releaseScrollLock = undefined;
        dialog.close();
      }
    },
    handleNativeClose(event) {
      if (this.persistent && event?.type === 'cancel') {
        event.preventDefault();
        return;
      }

      this.releaseScrollLock?.();
      this.releaseScrollLock = undefined;
      this.stopViewport?.();

      if (this.isOpen) {
        this.$emit('update:modelValue', false);
        this.$emit('input', false);
      }

      this.$emit('close');
    },
    handleBackdropClick(event) {
      if (!this.closeOnBackdrop || this.persistent || event.target !== this.$refs.dialog) {
        return;
      }

      this.$refs.dialog.close();
    },
    handleEscapeKey(event) {
      const ownerDialog = event.target?.closest?.('dialog');

      if (this.persistent && (!ownerDialog || ownerDialog === this.$refs.dialog)) {
        event.preventDefault();
      }
    },
    showModal() {
      this.syncState(true);
    },
    close() {
      this.syncState(false);
    },
  },
};
</script>
<style src="../../styles/ui-dialogs.css"></style>
