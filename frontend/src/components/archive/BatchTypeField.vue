<template>
  <div class="archive-dialog__field">
    <label
      :for="fieldId"
      class="archive-dialog__label"
    >
      الدفعة
    </label>
    <AppNativeSelect
      :id="fieldId"
      :value="value"
      class="archive-dialog__select"
      @input="$emit('input', $event)"
    >
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </AppNativeSelect>
  </div>
</template>

<script>
import { AppNativeSelect } from '../ui';

export default {
  name: 'BatchTypeField',
  components: { AppNativeSelect },
  props: {
    value: { type: String, required: true },
    options: { type: Array, required: true },
    fieldId: { type: String, default: 'archive-batch-type' },
  },
  emits: ['input'],
};
</script>
