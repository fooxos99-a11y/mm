<template>
  <div class="archive-dialog__field">
    <label
      :for="fieldId"
      class="archive-dialog__label"
    >
      الدفعة
    </label>
    <AppSelect
      :id="fieldId"
      :value="value"
      :items="options"
      item-text="label"
      item-value="value"
      :hide-details="!error"
      :error-messages="error"
      class="archive-dialog__select"
      @input="$emit('input', $event)"
    />
  </div>
</template>

<script>
import { AppSelect } from '../ui';

export default {
  name: 'BatchTypeField',
  components: { AppSelect },
  props: {
    value: { type: String, required: true },
    options: { type: Array, required: true },
    fieldId: { type: String, default: 'archive-batch-type' },
    error: { type: String, default: '' },
  },
  emits: ['input'],
};
</script>
