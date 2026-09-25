<template>
  <div class="assessment-inline-builder">
    <div
      v-if="forms.length"
      class="assessment-inline-builder__list"
    >
      <article
        v-for="(form, formIndex) in forms"
        :key="`question-form-${formIndex}`"
        class="assessment-form-card assessment-form-card--inline"
      >
        <div class="assessment-form-card__topline">
          <div class="assessment-form-card__meta">
            <AppRawButton
              type="button"
              class="assessment-form-card__trash"
              :aria-label="`حذف السؤال ${existingCount + formIndex + 1}`"
              @click="$emit('remove-form', formIndex)"
            >
              <v-icon
                class="app-action-icon app-action-icon--delete"
                aria-hidden="true"
              >
                mdi-delete-outline
              </v-icon>
            </AppRawButton>
          </div>
        </div>

        <div class="assessment-form-card__prompt-row">
          <div class="assessment-form-card__field-group assessment-form-card__field-group--compact assessment-form-card__field-group--prompt">
            <label
              class="assessment-form-card__label"
              :for="promptId(formIndex)"
            >{{ existingCount + formIndex + 1 }}.السؤال</label>
            <input
              :id="promptId(formIndex)"
              :value="form.prompt"
              type="text"
              class="assessment-input"
              placeholder="اكتب السؤال"
              @input="updateForm(formIndex, { prompt: $event.target.value }, true)"
              @paste="$emit('prompt-paste', formIndex, $event)"
            >
          </div>

          <div class="assessment-form-card__field-group assessment-form-card__field-group--compact assessment-form-card__field-group--points-inline">
            <label
              class="assessment-form-card__label"
              :for="pointsId(formIndex)"
            >الدرجة</label>
            <input
              :id="pointsId(formIndex)"
              :value="form.points"
              type="number"
              min="0"
              class="assessment-input assessment-input--points"
              placeholder="1"
              @input="updateForm(formIndex, { points: $event.target.value })"
            >
          </div>
        </div>

        <div
          v-if="form.type === 'multiple'"
          class="assessment-form-card__field-group"
        >
          <div class="assessment-options-grid">
            <div
              v-for="(option, optionIndex) in form.options"
              :key="`form-${formIndex}-option-${optionIndex}`"
              class="assessment-options-grid__item"
              :class="{ 'assessment-options-grid__item--correct': isCorrect(form, option) }"
            >
              <AppRawButton
                v-if="option.trim()"
                type="button"
                class="assessment-options-grid__check"
                :class="{ 'assessment-options-grid__check--active': isCorrect(form, option) }"
                :aria-pressed="isCorrect(form, option)"
                :aria-label="`تحديد الخيار ${optionIndex + 1} إجابة صحيحة`"
                @click="$emit('select-correct', formIndex, optionIndex)"
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
                :aria-label="`الخيار ${optionIndex + 1} للسؤال ${existingCount + formIndex + 1}`"
                :placeholder="`الخيار ${optionIndex + 1}`"
                @input="$emit('option-change', formIndex, optionIndex, $event.target.value)"
                @paste="$emit('option-paste', formIndex, optionIndex, $event)"
              >
              <AppRawButton
                v-if="optionIndex === form.options.length - 1"
                type="button"
                class="assessment-options-grid__append"
                aria-label="إضافة خيار"
                @click="$emit('add-option', formIndex)"
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

        <p
          v-if="errors[formIndex]"
          class="assessment-form-card__error"
          role="alert"
        >
          {{ errors[formIndex] }}
        </p>
      </article>
    </div>

    <div class="assessment-inline-builder__actions">
      <v-menu
        offset-y
        left
      >
        <template #activator="{ props }">
          <AppRawButton
            type="button"
            class="assessment-inline-builder__add"
            :aria-label="isTasksPage ? 'إضافة مهمة أدائية' : 'إضافة سؤال'"
            v-bind="props"
          >
            <v-icon
              small
              aria-hidden="true"
            >
              mdi-plus
            </v-icon>
          </AppRawButton>
        </template>

        <div class="assessment-inline-builder__menu">
          <AppRawButton
            type="button"
            class="assessment-inline-builder__menu-item"
            @click="$emit('add-question', 'multiple')"
          >
            خيارات
          </AppRawButton>
          <AppRawButton
            type="button"
            class="assessment-inline-builder__menu-item"
            @click="$emit('add-question', 'text')"
          >
            نصي
          </AppRawButton>
          <AppRawButton
            type="button"
            class="assessment-inline-builder__menu-item"
            @click="$emit('add-question', 'truefalse')"
          >
            صح أو خطأ
          </AppRawButton>
          <AppRawButton
            v-if="canAddDocument"
            type="button"
            class="assessment-inline-builder__menu-item"
            @click="$emit('add-question', 'document')"
          >
            وورد
          </AppRawButton>
        </div>
      </v-menu>

      <AppButton
        variant="primary"
        :loading="saving"
        :disabled="saving"
        @click="$emit('save')"
      >
        {{ saving ? 'جارٍ الحفظ...' : 'حفظ' }}
      </AppButton>
    </div>
  </div>
</template>

<script>
import { isCorrectQuestionOption } from '../../features/assessmentQuestions/questionModel.mjs';
import { AppButton, AppRawButton } from '../ui';

export default {
  name: 'AssessmentQuestionBuilder',
  components: { AppButton, AppRawButton },
  props: {
    forms: { type: Array, default: () => [] },
    errors: { type: Array, default: () => [] },
    existingCount: { type: Number, default: 0 },
    isTasksPage: { type: Boolean, default: false },
    hasExistingQuestions: { type: Boolean, default: false },
    isDocumentMode: { type: Boolean, default: false },
    saving: { type: Boolean, default: false },
  },
  computed: {
    canAddDocument() {
      return this.isTasksPage && !this.hasExistingQuestions && !this.forms.length && !this.isDocumentMode;
    },
  },
  methods: {
    promptId(index) {
      return `assessment-new-question-${index}-prompt`;
    },
    pointsId(index) {
      return `assessment-new-question-${index}-points`;
    },
    isCorrect(form, option) {
      return isCorrectQuestionOption(form, option);
    },
    updateForm(index, patch, clearError = false) {
      this.$emit('update-form', index, patch);
      if (clearError) this.$emit('clear-error', index);
    },
  },
};
</script>
