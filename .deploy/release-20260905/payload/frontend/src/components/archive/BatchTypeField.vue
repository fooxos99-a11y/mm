<template>
  <div class="archive-dialog__field">
    <label
      for="archive-batch-type"
      class="archive-dialog__label"
    >
      الدفعة
    </label>
    <AppNativeSelect
      id="archive-batch-type"
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
  },
};
</script>
