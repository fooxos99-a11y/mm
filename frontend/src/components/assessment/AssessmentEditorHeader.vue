<template>
  <div
    v-if="questions.length > 1"
    class="assessment-editor-header"
  >
    <AppNativeSelect
      v-if="questions.length > 1"
      aria-label="الانتقال إلى سؤال"
      :value="''"
      @change="$emit('navigate', $event.target.value)"
    >
      <option
        value=""
        disabled
      >
        الانتقال إلى سؤال
      </option>
      <option
        v-for="(question, index) in questions"
        :key="question.promptId"
        :value="question.promptId"
      >
        السؤال {{ index + 1 }}
      </option>
    </AppNativeSelect>
  </div>
</template>
<script>
import { AppNativeSelect } from '../ui';
export default {
  name: 'AssessmentEditorHeader',
  components: { AppNativeSelect },
  props: { questions: { type: Array, required: true } },
  emits: ['navigate'],
};
</script>
<style scoped>
.assessment-editor-header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; }
.assessment-editor-header select { width: auto; max-width: 100%; }
</style>
