<template>
  <v-select
    :model-value="currentValue"
    v-bind="forwardedAttrs"
    :menu-props="resolvedMenuProps"
    :class="['app-select', $attrs.class]"
    @update:model-value="updateValue"
  >
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
      return normalizeVuetifyFieldAttrs(this.$attrs);
    },
    currentValue() {
      return this.modelValue !== undefined ? this.modelValue : this.value;
    },
    forwardedScopedSlotNames() {
      return Object.keys(this.$slots || {});
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
