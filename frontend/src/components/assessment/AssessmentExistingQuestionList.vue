<template>
  <div
    v-if="questions.length"
    class="assessment-inline-list"
  >
    <AssessmentEditorQuestion
      v-for="(question, index) in questions"
      :key="question.id"
      class="assessment-inline-list__item"
      :draft="drafts[question.id] || {}"
      :number="index + 1"
      :prompt-id="`assessment-question-${question.id}-prompt`"
      :points-id="`assessment-question-${question.id}-points`"
      :error="errors[question.id] || ''"
      :can-edit="canEdit"
      :allow-option-removal="allowOptionRemoval"
      :saving="saving"
      @remove="$emit('remove', question.id)"
      @update="updateDraft(question.id, $event)"
      @prompt-paste="$emit('prompt-paste', question.id, $event)"
      @option-change="(optionIndex, value) => $emit('option-change', question.id, optionIndex, value)"
      @option-paste="(optionIndex, event) => $emit('option-paste', question.id, optionIndex, event)"
      @select-correct="$emit('select-correct', question.id, $event)"
      @add-option="$emit('add-option', question.id)"
      @remove-option="$emit('remove-option', question.id, $event)"
    />
  </div>
  <AppEmptyState
    v-else
    title-tag="h2"
    title="لا توجد أسئلة بعد"
    :description="emptyText === 'لا توجد أسئلة بعد.' ? '' : emptyText"
    class="assessment-editor-empty"
  />
</template>

<script>
import AssessmentEditorQuestion from './AssessmentEditorQuestion.vue';
import { AppEmptyState } from '../ui';

export default {
  name: 'AssessmentExistingQuestionList',
  components: { AssessmentEditorQuestion, AppEmptyState },
  props: {
    questions: { type: Array, default: () => [] },
    drafts: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
    emptyText: { type: String, default: '' },
    canEdit: { type: Boolean, default: false },
    allowOptionRemoval: { type: Boolean, default: false },
    saving: { type: Boolean, default: false },
  },
  emits: ['remove', 'prompt-paste', 'select-correct', 'option-change', 'option-paste', 'add-option', 'remove-option', 'update-draft', 'clear-error'],
  methods: {
    updateDraft(id, patch) {
      this.$emit('update-draft', id, patch);
      this.$emit('clear-error', id);
    },
  },
};
</script>
<style scoped>
.assessment-inline-list { display: grid; gap: 16px; }
.assessment-editor-empty { min-height: 112px; padding: 16px; }
</style>
