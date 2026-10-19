<template>
  <component
    :is="mobile ? 'dialog' : 'aside'"
    ref="panel"
    class="dashboard-sidebar"
    :class="{ 'dashboard-sidebar--mobile': mobile, 'dashboard-sidebar--open': mobile && open, 'dashboard-sidebar--closing': mobile && !open }"
    :aria-label="label"
    @cancel.prevent="requestClose"
    @close="handleClose"
    @click="handleBackdrop"
  >
    <AppIconButton
      v-if="mobile"
      variant="plain"
      class="mobile-sidebar-close"
      aria-label="إغلاق القائمة"
      @click="requestClose"
    >
      <v-icon aria-hidden="true">
        mdi-menu
      </v-icon>
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
let motion;
let syncVersion = 0;

function requestClose() { emit('close'); }
function handleClose() { if (mobile.value && props.open && !panel.value?.open) requestClose(); }
function handleBackdrop(event) {
  if (!mobile.value || event.target !== panel.value) return;
  const rect = panel.value.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) requestClose();
}
async function sync() {
  const version = ++syncVersion;
  await nextTick();
  if (disposed || version !== syncVersion || !panel.value) return;
  const element = panel.value;
  const from = motion ? getComputedStyle(element).transform : null;
  motion?.cancel(); motion = undefined;
  stopViewport?.();
  stopViewport = observeOverlayViewport(element);
  if (mobile.value && props.open) {
    const wasOpen = element.open;
    if (!wasOpen) {
      opener = document.activeElement;
      releaseLock = lockPageScroll();
      element.showModal();
      if (!opener?.matches(':focus-visible')) element.focus({ preventScroll: true });
    }
    if (!wasOpen || from) await animatePanel(element, from || 'translateX(100%)', 'translateX(0)');
  } else {
    if (mobile.value && element.open) {
      await animatePanel(element, from || 'translateX(0)', 'translateX(100%)');
      if (disposed || version !== syncVersion) return;
    }
    if (element.open) element.close();
    releaseLock?.(); releaseLock = undefined;
    if (mobile.value && opener?.isConnected) opener.focus({ preventScroll: true });
    opener = undefined;
  }
}
async function animatePanel(element, from, to) {
  if (!element.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const animation = element.animate([{ transform: from }, { transform: to }], {
    duration: 240, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'forwards',
  });
  motion = animation;
  try { await animation.finished; }
  catch (error) { if (error.name !== 'AbortError') throw error; }
  if (motion === animation) { motion = undefined; animation.cancel(); }
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
  syncVersion++;
  motion?.cancel();
  media?.removeEventListener('change', resize);
  stopViewport?.();
  releaseLock?.();
});
</script>

<style src="../../styles/components/mobile-sidebar.css"></style>
