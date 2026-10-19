<template>
  <v-select
    ref="selectField"
    :model-value="currentValue"
    v-bind="forwardedAttrs"
    :menu-props="resolvedMenuProps"
    :class="['app-select', $attrs.class]"
    @update:model-value="updateValue"
    @keydown.esc.capture="closeMenu"
  >
    <template
      v-if="$slots['item-actions']"
      #item="{ item, props: itemProps }"
    >
      <v-list-item
        v-bind="actionItemProps(itemProps)"
        :title="undefined"
        role="row"
        :aria-label="item.title"
        class="app-select-action-row"
        @keydown="handleActionKeys"
      >
        <template #title>
          <div
            role="gridcell"
            class="app-select-action-row__label"
          >
            <slot
              name="item-title"
              :item="item.raw"
            >
              {{ item.title }}
            </slot>
          </div>
        </template>
        <template #append>
          <div
            role="gridcell"
            class="app-select-action-row__actions"
            @mousedown.stop.prevent
            @click.stop
            @keydown.enter.stop
            @keydown.space.stop
          >
            <slot
              name="item-actions"
              :item="item.raw"
              :action-attrs="{ tabindex: -1 }"
            />
          </div>
        </template>
      </v-list-item>
    </template>
    <template
      v-for="slotName in forwardedScopedSlotNames"
      #[slotName]="slotProps"
    >
      <slot
        :name="slotName"
        v-bind="normalizedScopedSlotProps(slotName, slotProps)"
      />
    </template>
  </v-select>
</template>

<script>
import { normalizeVuetifyFieldAttrs } from './vuetifyFieldAttrs';
import { normalizeSelectItemSlotProps } from './selectSlotProps.mjs';

const mergeContentClass = (baseClass, extraClass) => {
  const classes = [baseClass, extraClass]
    .flatMap((value) => String(value || '').split(/\s+/))
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(new Set(classes)).join(' ');
};

export default {
  name: 'AppSelect',
  inheritAttrs: false,
  props: {
    modelValue: {
      type: null,
      default: undefined,
    },
    value: {
      type: null,
      default: undefined,
    },
    menuProps: {
      type: [Object, String],
      default: null,
    },
  },
  emits: ['update:modelValue', 'input', 'change'],
  data() {
    return {
      menuAttachTarget: null,
    };
  },
  computed: {
    forwardedAttrs() {
      const attrs = { variant: 'outlined', density: 'comfortable', color: 'primary', ...normalizeVuetifyFieldAttrs(this.$attrs) };
      if (this.$slots['item-actions']) {
        attrs['aria-haspopup'] = 'grid';
        attrs['list-props'] = { ...(attrs['list-props'] || attrs.listProps || {}), role: 'grid' };
      }
      return attrs;
    },
    currentValue() {
      return this.modelValue !== undefined ? this.modelValue : this.value;
    },
    forwardedScopedSlotNames() {
      return Object.keys(this.$slots || {}).filter(name => !['item-actions', 'item-title'].includes(name) && !(name === 'item' && this.$slots['item-actions']));
    },
    resolvedMenuProps() {
      const globalMenuProps = this.$dropdownMenuProps || {};

      if (typeof this.menuProps === 'string') {
        return {
          ...globalMenuProps,
          attach: this.menuAttachTarget,
          contentClass: mergeContentClass(globalMenuProps.contentClass, this.menuProps),
        };
      }

      const localMenuProps = this.menuProps || {};

      return {
        ...globalMenuProps,
        ...localMenuProps,
        attach: localMenuProps.attach !== undefined ? localMenuProps.attach : this.menuAttachTarget,
        contentClass: mergeContentClass(globalMenuProps.contentClass, localMenuProps.contentClass),
      };
    },
  },
  mounted() {
    this.menuAttachTarget = this.resolveAttachTarget();
  },
  methods: {
    handleActionKeys(event) {
      const row = event.currentTarget;
      const rows = [...row.closest('[role="grid"]').querySelectorAll('.app-select-action-row')];
      let target;
      if (event.key === 'Tab' || ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
        const controls = rows.flatMap(item => [item, ...item.querySelectorAll('button:not(:disabled)')]);
        const backwards = event.key === 'Tab' ? event.shiftKey : event.key === 'ArrowRight';
        target = controls[controls.indexOf(event.target) + (backwards ? -1 : 1)];
      } else if (['ArrowUp', 'ArrowDown'].includes(event.key)) {
        target = rows[rows.indexOf(row) + (event.key === 'ArrowUp' ? -1 : 1)];
      }
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      target.focus();
    },
    actionItemProps(props) {
      const attrs = { ...props };
      delete attrs['aria-posinset'];
      delete attrs['aria-setsize'];
      return attrs;
    },
    closeMenu(event) {
      const field = this.$refs.selectField;
      if (!field?.menu) return;
      event?.preventDefault();
      event?.stopPropagation();
      field.menu = false;
    },
    normalizedScopedSlotProps(slotName, slotProps) {
      return slotName === 'item' ? normalizeSelectItemSlotProps(slotProps) : slotProps;
    },
    updateValue(value) {
      this.$emit('update:modelValue', value);
      this.$emit('input', value);
      this.$emit('change', value);
    },
    resolveAttachTarget() {
      const modal = this.$el?.closest('.modal');

      if (modal) {
        return this.$el;
      }

      return false;
    },
  },
};
</script>
<style scoped>
.app-select-action-row { min-height: 52px; padding-inline: 12px 4px; gap: 4px; }
.app-select-action-row :deep(.v-list-item-title) { white-space: normal; overflow-wrap: anywhere; overflow: visible; }
.app-select-action-row__label { display: flex; align-items: center; gap: 8px; min-width: 0; }
.app-select-action-row__actions { display: flex; gap: 0; flex-shrink: 0; }
.app-select-action-row__actions :deep(.app-icon-button) { width: 44px; height: 44px; min-width: 44px; min-height: 44px; border: 0; background: transparent; }
.app-select-action-row__actions :deep(.v-icon) { font-size: 18px; width: 18px; height: 18px; }
</style>
