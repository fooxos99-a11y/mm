<template>
  <div class="assessment-question-answer">
    <div
      v-if="isChoiceQuestion"
      class="assessment-options-grid"
      role="group"
      :aria-label="question.prompt"
    >
      <AppChoiceButton
        v-for="(option, index) in options"
        :key="`${question.id}-${index}`"
        block
        class="assessment-option"
        :class="{ 'assessment-option--active': modelValue === option }"
        :active="modelValue === option"
        :aria-pressed="modelValue === option"
        @click="$emit('update:modelValue', option)"
      >
        {{ option }}
      </AppChoiceButton>
    </div>
    <AppInput
      v-else
      :model-value="modelValue"
      multiline
      :rows="5"
      class="assessment-textarea"
      :aria-label="question.prompt"
      placeholder="اكتب إجابتك هنا"
      @update:model-value="$emit('update:modelValue', $event)"
    />
  </div>
</template>

<script>
import { AppChoiceButton, AppInput } from '../ui';

export default {
  name: 'AssessmentQuestionAnswer',
  components: { AppChoiceButton, AppInput },
  props: {
    question: { type: Object, required: true },
    modelValue: { type: String, default: '' },
  },
  emits: ['update:modelValue'],
  computed: {
    isChoiceQuestion() {
      return ['multiple', 'truefalse'].includes(this.question.type);
    },
    options() {
      const savedOptions = Array.isArray(this.question.options) ? this.question.options : [];
      return this.question.type === 'truefalse' && savedOptions.length === 0
        ? ['صح', 'خطأ'] : savedOptions;
    },
  },
};
</script>

<style scoped src="../../styles/components/assessment-question-answer.css"></style>
