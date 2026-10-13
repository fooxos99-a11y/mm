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
        ref="textarea"
        :value="currentValue"
        :rows="rows"
        :placeholder="placeholder"
        :disabled="disabled"
        class="app-field__input app-field__input--textarea"
        v-bind="$attrs"
        :aria-invalid="error ? 'true' : $attrs['aria-invalid']"
        :aria-describedby="describedBy"
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
        :aria-invalid="error ? 'true' : $attrs['aria-invalid']"
        :aria-describedby="describedBy"
        @input="updateValue($event.target.value)"
        @change="$emit('change', $event.target.value)"
      >
      <slot name="append" />
    </span>
    <span
      v-if="error || hint"
      :id="messageId"
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
    autoResize: { type: Boolean, default: false },
    rows: { type: [String, Number], default: 4 },
    disabled: { type: Boolean, default: false },
  },
  emits: ['update:modelValue', 'input', 'change'],
  computed: {
    messageId() {
      return `app-field-message-${this.$.uid}`;
    },
    describedBy() {
      return [this.$attrs['aria-describedby'], this.error || this.hint ? this.messageId : null].filter(Boolean).join(' ') || undefined;
    },
    currentValue() {
      return this.modelValue !== undefined ? this.modelValue : this.value;
    },
  },
  watch: {
    currentValue() { this.$nextTick(this.resizeTextarea); },
  },
  mounted() {
    this.resizeTextarea();
    if (this.autoResize && this.$refs.textarea && typeof ResizeObserver !== 'undefined') {
      this.textareaResizeObserver = new ResizeObserver(entries => {
        const width = entries[0]?.contentRect.width;
        if (width === this.lastTextareaWidth) return;
        this.lastTextareaWidth = width;
        cancelAnimationFrame(this.textareaResizeFrame);
        this.textareaResizeFrame = requestAnimationFrame(() => this.resizeTextarea());
      });
      this.textareaResizeObserver.observe(this.$refs.textarea.parentElement);
    }
  },
  beforeUnmount() {
    this.textareaResizeObserver?.disconnect();
    cancelAnimationFrame(this.textareaResizeFrame);
  },
  methods: {
    resizeTextarea() {
      const textarea = this.$refs.textarea;
      if (!this.autoResize || !textarea) return;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    },
    updateValue(value) {
      this.$emit('update:modelValue', value);
      this.$emit('input', value);
      this.$nextTick(this.resizeTextarea);
    },
  },
};
</script>
