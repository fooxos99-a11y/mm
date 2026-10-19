<script>
import { Comment, Fragment, Text, h } from 'vue';

const flatten = (nodes) => nodes.flatMap(node => {
  if (node.type === Fragment) return flatten(node.children || []);
  return node.type === Comment || (node.type === Text && !String(node.children).trim()) ? [] : [node];
});

const explicitRole = node => node.props?.actionRole || node.props?.['action-role'];
const isMain = node => explicitRole(node) === 'primary'
  || (!explicitRole(node) && node.type?.name === 'AppButton'
    && ['primary', 'success'].includes(node.props?.variant || 'primary'));

export default {
  name: 'AppActionBar',
  render() {
    const nodes = flatten(this.$slots.default?.() || []);
    const hasMain = nodes.some(isMain);
    const primary = [];
    const secondary = [];
    for (const node of nodes) {
      const main = isMain(node) || (!hasMain && !explicitRole(node)
        && node.type?.name === 'AppButton' && node.props?.variant === 'danger');
      (main ? primary : secondary).push(node);
    }
    // Render in reading order as well as visual order: secondary right, primary left.
    return h('div', { class: 'app-action-bar', dir: 'rtl' }, [
      secondary.length ? h('div', { class: 'app-action-bar__group app-action-bar__secondary' }, secondary) : null,
      primary.length ? h('div', { class: 'app-action-bar__group app-action-bar__primary' }, primary) : null,
    ]);
  },
};
</script>

<style scoped>
.app-action-bar.app-action-bar[dir="rtl"] {
  display: flex;
  flex-flow: row nowrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
  max-width: 100%;
}
.app-action-bar__group {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 12px;
  min-width: 0;
  max-width: 100%;
}
.app-action-bar__secondary { justify-content: flex-start; }
.app-action-bar__primary { justify-content: flex-end; margin-inline-start: auto; }
.app-action-bar__group > :deep(.app-button) {
  min-width: min(112px, 100%);
  max-width: 100%;
  white-space: normal;
}
.app-action-bar.app-dialog-footer > .app-action-bar__group { flex: 1 1 0; }
.app-action-bar.app-dialog-footer > .app-action-bar__group > :deep(.app-button) {
  flex: 1 1 112px;
  max-width: 168px;
}
@media (max-width: 600px) {
  .app-action-bar__group { flex: 1 1 0; }
  .app-action-bar__group > :deep(.app-button) { flex: 1 1 auto; width: 100%; }
  .app-action-bar.app-dialog-footer > .app-action-bar__group > :deep(.app-button) { max-width: none; }
}
</style>
