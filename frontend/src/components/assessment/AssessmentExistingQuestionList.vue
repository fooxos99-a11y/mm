<template>
  <div
    v-if="questions.length"
    class="assessment-inline-list"
  >
    <article
      v-for="(question, index) in questions"
      :key="question.id"
      class="assessment-form-card assessment-form-card--inline assessment-inline-list__item"
    >
      <div class="assessment-form-card__prompt-row">
        <div class="assessment-form-card__field-group assessment-form-card__field-group--compact assessment-form-card__field-group--prompt">
          <div class="assessment-form-card__label-row">
            <label
              class="assessment-form-card__label"
              :for="promptId(question.id)"
            >
              {{ index + 1 }}.السؤال
            </label>
            <AppRawButton
              v-if="canEdit"
              type="button"
              class="assessment-form-card__trash"
              :aria-label="`حذف السؤال ${index + 1}`"
              :disabled="saving"
              @click="$emit('remove', question.id)"
            >
              <v-icon
                class="app-action-icon app-action-icon--delete"
                aria-hidden="true"
              >
                mdi-delete-outline
              </v-icon>
            </AppRawButton>
          </div>
          <input
            :id="promptId(question.id)"
            :value="draftFor(question.id).prompt || ''"
            type="text"
            class="assessment-input"
            placeholder="اكتب السؤال"
            :disabled="!canEdit || saving"
            @input="updateDraft(question.id, { prompt: $event.target.value }, true)"
            @paste="$emit('prompt-paste', question.id, $event)"
          >
        </div>

        <div class="assessment-form-card__field-group assessment-form-card__field-group--compact assessment-form-card__field-group--points-inline">
          <label
            class="assessment-form-card__label"
            :for="pointsId(question.id)"
          >الدرجة</label>
          <input
            :id="pointsId(question.id)"
            :value="draftFor(question.id).points || '1'"
            type="number"
            min="0"
            class="assessment-input assessment-input--points"
            placeholder="1"
            :disabled="!canEdit || saving"
            @input="updateDraft(question.id, { points: $event.target.value })"
          >
        </div>
      </div>

      <div
        v-if="question.type !== 'text'"
        class="assessment-form-card__field-group"
      >
        <div class="assessment-options-grid">
          <div
            v-for="(option, optionIndex) in draftFor(question.id).options || []"
            :key="`${question.id}-${optionIndex}`"
            class="assessment-options-grid__item"
            :class="{ 'assessment-options-grid__item--correct': isCorrect(question.id, option) }"
          >
            <AppRawButton
              v-if="option.trim()"
              type="button"
              class="assessment-options-grid__check"
              :class="{ 'assessment-options-grid__check--active': isCorrect(question.id, option) }"
              :aria-pressed="isCorrect(question.id, option)"
              :disabled="!canEdit || saving"
              :aria-label="`تحديد الخيار ${optionIndex + 1} إجابة صحيحة`"
              @click="$emit('select-correct', question.id, optionIndex)"
            >
              <v-icon
                small
                aria-hidden="true"
              >
                mdi-check
              </v-icon>
            </AppRawButton>
            <input
              :value="option"
              type="text"
              class="assessment-input"
              :aria-label="`الخيار ${optionIndex + 1} للسؤال ${index + 1}`"
              :placeholder="`الخيار ${optionIndex + 1}`"
              :disabled="!canEdit || saving"
              @input="$emit('option-change', question.id, optionIndex, $event.target.value)"
              @paste="$emit('option-paste', question.id, optionIndex, $event)"
            >
            <AppRawButton
              v-if="canEdit && optionIndex === (draftFor(question.id).options || []).length - 1"
              type="button"
              class="assessment-options-grid__append"
              aria-label="إضافة خيار"
              :disabled="saving"
              @click="$emit('add-option', question.id)"
            >
              <v-icon
                small
                aria-hidden="true"
              >
                mdi-plus
              </v-icon>
            </AppRawButton>
          </div>
        </div>
      </div>

      <div class="assessment-inline-list__actions">
        <p
          v-if="errors[question.id]"
          class="assessment-form-card__error"
          role="alert"
        >
          {{ errors[question.id] }}
        </p>
      </div>
    </article>
  </div>

  <div
    v-else
    class="assessment-empty-state"
  >
    {{ emptyText }}
  </div>
</template>

<script>
import { isCorrectQuestionOption } from '../../features/assessmentQuestions/questionModel.mjs';
import { AppRawButton } from '../ui';

export default {
  name: 'AssessmentExistingQuestionList',
  components: { AppRawButton },
  props: {
    questions: { type: Array, default: () => [] },
    drafts: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
    emptyText: { type: String, default: 'لا توجد أسئلة بعد.' },
    canEdit: { type: Boolean, default: false },
    saving: { type: Boolean, default: false },
  },
  emits: [
    'remove',
    'prompt-paste',
    'select-correct',
    'option-change',
    'option-paste',
    'add-option',
    'update-draft',
    'clear-error',
  ],
  methods: {
    draftFor(questionId) {
      return this.drafts[questionId] || {};
    },
    promptId(questionId) {
      return `assessment-question-${questionId}-prompt`;
    },
    pointsId(questionId) {
      return `assessment-question-${questionId}-points`;
    },
    isCorrect(questionId, option) {
      return isCorrectQuestionOption(this.draftFor(questionId), option);
    },
    updateDraft(questionId, patch, clearError = false) {
      this.$emit('update-draft', questionId, patch);
      if (clearError) this.$emit('clear-error', questionId);
    },
  },
};
</script>
