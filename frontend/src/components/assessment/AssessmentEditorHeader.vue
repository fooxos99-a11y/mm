<template>
  <div
    v-if="questions.length > 1"
    class="assessment-editor-header"
  >
    <AppSelect
      v-if="questions.length > 1"
      aria-label="الانتقال إلى سؤال"
      :model-value="null"
      :items="questions.map((question, index) => ({ value: question.promptId, label: `السؤال ${index + 1}` }))"
      item-text="label"
      item-value="value"
      placeholder="الانتقال إلى سؤال"
      hide-details
      @update:model-value="$emit('navigate', $event)"
    />
  </div>
</template>
<script>
import { AppSelect } from '../ui';
export default {
  name: 'AssessmentEditorHeader',
  components: { AppSelect },
  props: { questions: { type: Array, required: true } },
  emits: ['navigate'],
};
</script>
<style scoped>
.assessment-editor-header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; }
.assessment-editor-header .app-select { flex: 0 1 240px; max-width: 100%; }
</style>
