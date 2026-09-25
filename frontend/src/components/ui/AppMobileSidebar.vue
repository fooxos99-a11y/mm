<template>
  <component
    :is="mobile ? 'dialog' : 'aside'"
    ref="panel"
    class="dashboard-sidebar"
    :class="{ 'dashboard-sidebar--mobile': mobile, 'dashboard-sidebar--open': mobile && open }"
    :aria-label="label"
    @cancel.prevent="requestClose"
    @close="handleClose"
    @click="handleBackdrop"
  >
    <AppIconButton
      v-if="mobile"
      class="mobile-sidebar-close"
      aria-label="إغلاق القائمة"
      @click="requestClose"
    >
      <span aria-hidden="true">×</span>
    </AppIconButton>
    <slot />
  </component>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { lockPageScroll } from '../../utils/pageScrollLock';
import { observeOverlayViewport } from '../../utils/overlayViewport';
import AppIconButton from './AppIconButton.vue';

const props = defineProps({ open: Boolean, label: { type: String, default: 'القائمة الرئيسية' } });
const emit = defineEmits(['close']);
const panel = ref(null);
const mobile = ref(window.matchMedia('(max-width: 1024px)').matches);
let media;
let releaseLock;
let stopViewport;
let opener;
let disposed = false;

function requestClose() { emit('close'); }
function handleClose() { if (mobile.value && props.open) requestClose(); }
function handleBackdrop(event) {
  if (!mobile.value || event.target !== panel.value) return;
  const rect = panel.value.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) requestClose();
}
async function sync() {
  await nextTick();
  if (disposed || !panel.value) return;
  stopViewport?.();
  stopViewport = observeOverlayViewport(panel.value);
  if (mobile.value && props.open) {
    if (!panel.value.open) {
      opener = document.activeElement;
      releaseLock = lockPageScroll();
      panel.value.showModal();
    }
  } else {
    releaseLock?.(); releaseLock = undefined;
    if (panel.value.open) panel.value.close();
    if (mobile.value && opener?.isConnected) opener.focus({ preventScroll: true });
    opener = undefined;
  }
}
function resize(event) {
  mobile.value = event.matches;
  if (!event.matches) { releaseLock?.(); releaseLock = undefined; requestClose(); }
}
watch(() => [props.open, mobile.value], sync);
onMounted(() => {
  media = window.matchMedia('(max-width: 1024px)');
  media.addEventListener('change', resize);
  sync();
});
onBeforeUnmount(() => {
  disposed = true;
  media?.removeEventListener('change', resize);
  stopViewport?.();
  releaseLock?.();
});
</script>

<style src="../../styles/components/mobile-sidebar.css"></style>
