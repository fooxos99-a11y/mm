<template>
  <select
    :id="id"
    :value="currentValue"
    v-bind="forwardedAttrs"
    :class="['app-native-select', inheritedClass]"
    @change="handleChange"
  >
    <slot />
  </select>
</template>

<script>
const normalizeClass = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(normalizeClass);
  }

  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([className]) => className);
  }

  return String(value)
    .split(/\s+/)
    .map((className) => className.trim())
    .filter(Boolean);
};

export default {
  name: 'AppNativeSelect',
  inheritAttrs: false,
  props: {
    id: {
      type: String,
      default: undefined,
    },
    modelValue: {
      type: null,
      default: undefined,
    },
    value: {
      type: null,
      default: undefined,
    },
  },
  emits: ['update:modelValue', 'input', 'change'],
  computed: {
    currentValue() {
      return this.modelValue !== undefined ? this.modelValue : this.value;
    },
    forwardedAttrs() {
      const attrs = { ...this.$attrs };
      delete attrs.class;
      return attrs;
    },
    inheritedClass() {
      return Array.from(new Set(normalizeClass(this.$attrs.class)));
    },
  },
  methods: {
    handleChange(event) {
      this.$emit('update:modelValue', event.target.value);
      this.$emit('input', event.target.value);
      this.$emit('change', event);
    },
  },
};
</script>
