<template>
  <v-text-field
    v-bind="forwardedAttrs"
    :model-value="currentValue"
    :type="inputType"
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
    <template #append>
      <v-btn
        v-if="revealable"
        icon
        type="button"
        class="app-password-field__toggle"
        :aria-label="toggleLabel"
        :title="toggleLabel"
        @mousedown.prevent
        @click="visible = !visible"
      >
        <v-icon>{{ visible ? 'mdi-eye-off-outline' : 'mdi-eye-outline' }}</v-icon>
      </v-btn>
    </template>
  </v-text-field>
</template>

<script>
import { normalizeVuetifyFieldAttrs } from './vuetifyFieldAttrs';

export default {
  name: 'AppPasswordField',
  inheritAttrs: false,
  props: {
    modelValue: {
      type: String,
      default: undefined,
    },
    value: {
      type: String,
      default: '',
    },
    revealable: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['update:modelValue', 'input'],
  data() {
    return { visible: false };
  },
  computed: {
    forwardedAttrs() {
      return normalizeVuetifyFieldAttrs(this.$attrs);
    },
    currentValue() {
      return this.modelValue !== undefined ? this.modelValue : this.value;
    },
    inputType() {
      return this.visible ? 'text' : 'password';
    },
    toggleLabel() {
      return this.visible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور';
    },
    forwardedSlots() {
      return Object.keys(this.$slots).filter((slotName) => slotName !== 'append');
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

<style scoped>
.app-password-field__toggle {
  width: 44px;
  min-width: 44px;
  height: 44px;
  margin: -6px -8px -6px 0;
}
</style>
