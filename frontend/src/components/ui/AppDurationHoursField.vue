<template>
  <AppInput
    :value="minutes === '' ? '' : Number(minutes) / 60"
    label="مدة الفتح بالساعات"
    type="number"
    inputmode="decimal"
    :min="1 / 60"
    step="any"
    placeholder="1"
    @input="$emit('update:minutes', $event === '' ? '' : Number($event) * 60)"
  />
</template>

<script>
import AppInput from './AppInput.vue';

// Keep the existing minute-based state/API; only the editing unit changes.
export default {
  name: 'AppDurationHoursField',
  components: { AppInput },
  props: { minutes: { type: [Number, String], default: 60 } },
  emits: ['update:minutes'],
};
</script>
