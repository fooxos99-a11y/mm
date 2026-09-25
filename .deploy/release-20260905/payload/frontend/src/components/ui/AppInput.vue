<template>
  <label
    class="app-field"
    :class="{ 'app-field--error': error, 'app-field--disabled': disabled }"
  >
    <span
      v-if="label"
      class="app-field__label"
    >{{ label }}</span>
    <span class="app-field__control">
      <AppSvgIcon
        v-if="prependIcon"
        :icon="prependIcon"
        class="app-field__icon"
      />
      <textarea
        v-if="multiline"
        :value="currentValue"
        :rows="rows"
        :placeholder="placeholder"
        :disabled="disabled"
        class="app-field__input app-field__input--textarea"
        v-bind="$attrs"
        @input="updateValue($event.target.value)"
        @change="$emit('change', $event.target.value)"
      />
      <input
        v-else
        :value="currentValue"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        class="app-field__input"
        v-bind="$attrs"
        @input="updateValue($event.target.value)"
        @change="$emit('change', $event.target.value)"
      >
      <slot name="append" />
    </span>
    <span
      v-if="error || hint"
      class="app-field__message"
    >{{ error || hint }}</span>
  </label>
</template>

<script>
import AppSvgIcon from './AppSvgIcon.vue';

export default {
  name: 'AppInput',
  components: { AppSvgIcon },
  inheritAttrs: false,
  props: {
    modelValue: { type: [String, Number], default: undefined },
    value: { type: [String, Number], default: '' },
    label: { type: String, default: '' },
    type: { type: String, default: 'text' },
    placeholder: { type: String, default: '' },
    hint: { type: String, default: '' },
    error: { type: String, default: '' },
    prependIcon: { type: String, default: '' },
    multiline: { type: Boolean, default: false },
    rows: { type: [String, Number], default: 4 },
    disabled: { type: Boolean, default: false },
  },
  emits: ['update:modelValue', 'input', 'change'],
  computed: {
    currentValue() {
      return this.modelValue !== undefined ? this.modelValue : this.value;
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
