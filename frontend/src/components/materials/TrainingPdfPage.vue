<template>
  <article
    ref="host"
    class="training-pdf-page"
    :style="{ aspectRatio: ratio }"
    :aria-label="`صفحة ${number}`"
    :aria-busy="!ready"
  >
    <canvas
      ref="canvas"
      role="img"
      :aria-label="`صفحة ${number} من المستند`"
    />
    <div
      ref="text"
      class="training-pdf-text"
    />
    <span
      v-if="!ready"
      class="training-pdf-page__status"
      :role="failed ? 'alert' : 'status'"
    >
      {{ failed ? `تعذر تحميل صفحة ${number}` : `صفحة ${number} — جارٍ التحميل` }}
    </span>
  </article>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
const props = defineProps({ document: { type: Object, required: true }, number: { type: Number, required: true }, root: { type: Object, default: null } });
const host = ref(null);
const canvas = ref(null);
const text = ref(null);
const ready = ref(false);
const failed = ref(false);
const ratio = ref('0.707');
let observer, resize, renderTask, textLayer, page, timer;
let near = false, disposed = false, serial = 0;
async function render() {
  if (!near || disposed) return;
  const run = ++serial;
  failed.value = false;
  renderTask?.cancel();
  textLayer?.cancel();
  try {
    await renderTask?.promise.catch(() => {});
    page ||= await props.document.getPage(props.number);
    if (disposed || run !== serial) return;
    const natural = page.getViewport({ scale: 1 });
    ratio.value = String(natural.width / natural.height);
    const viewport = page.getViewport({ scale: host.value.clientWidth / natural.width });
    const density = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(8000000 / (viewport.width * viewport.height)));
    canvas.value.width = Math.floor(viewport.width * density);
    canvas.value.height = Math.floor(viewport.height * density);
    renderTask = page.render({ canvasContext: canvas.value.getContext('2d'), viewport, transform: [density, 0, 0, density, 0, 0] });
    await renderTask.promise;
    if (disposed || run !== serial) return;
    text.value.replaceChildren();
    text.value.style.setProperty('--total-scale-factor', viewport.scale);
    const { TextLayer } = await import('pdfjs-dist');
    if (disposed || run !== serial) return;
    textLayer = new TextLayer({ textContentSource: page.streamTextContent(), container: text.value, viewport });
    await textLayer.render();
    if (disposed || run !== serial) return;
    ready.value = true;
  } catch (cause) {
    if (!disposed && run === serial && cause?.name !== 'RenderingCancelledException') failed.value = true;
  }
}
function release() {
  serial++;
  renderTask?.cancel();
  textLayer?.cancel();
  text.value?.replaceChildren();
  ready.value = false;
  if (canvas.value) { canvas.value.width = 0; canvas.value.height = 0; }
  page?.cleanup();
}
function schedule() { clearTimeout(timer); timer = setTimeout(render, 120); }
onMounted(() => {
  observer = new IntersectionObserver(([entry]) => {
    near = entry.isIntersecting;
    if (near) render(); else release();
  }, { root: props.root, rootMargin: '100% 0px' });
  observer.observe(host.value);
  resize = new ResizeObserver(schedule);
  resize.observe(host.value);
});
onBeforeUnmount(() => { disposed = true; clearTimeout(timer); observer?.disconnect(); resize?.disconnect(); release(); });
</script>

<style scoped>
.training-pdf-page { position: relative; width: 100%; background: white; box-shadow: 0 2px 7px #10304a15; overflow: hidden; }
canvas { position: absolute; inset: 0; display: block; width: 100%; height: 100%; }
.training-pdf-page__status { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 10px; color: #496477; direction: rtl; }
</style>

<style scoped src="../../styles/training-pdf-text.css"></style>
