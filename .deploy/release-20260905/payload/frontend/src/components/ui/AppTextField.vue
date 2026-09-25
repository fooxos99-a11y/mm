<template>
  <v-text-field
    v-bind="forwardedAttrs"
    :model-value="currentValue"
    @update:model-value="updateValue"
  >
    <template
      v-for="slotName in forwardedSlots"
      #[slotName]="slotProps"
    >
      <slot
        :name="slotName"
        v-bind="slotProps"
      />
    </template>
  </v-text-field>
</template>

<script>
import { normalizeVuetifyFieldAttrs } from './vuetifyFieldAttrs';

export default {
  name: 'AppTextField',
  inheritAttrs: false,
  props: {
    modelValue: { type: [String, Number], default: undefined },
    value: { type: [String, Number], default: undefined },
  },
  emits: ['update:modelValue', 'input'],
  computed: {
    forwardedAttrs() {
      return normalizeVuetifyFieldAttrs(this.$attrs);
    },
    currentValue() {
      return this.modelValue !== undefined ? this.modelValue : this.value;
    },
    forwardedSlots() {
      return Object.keys(this.$slots);
    },
  },
  methods: {
    updateValue(value) {
      this.$emit('update:modelValue', value);
      this.$emit('input', value);
    },
  },
};
</script>
