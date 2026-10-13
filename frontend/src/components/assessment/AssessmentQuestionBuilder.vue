<template>
  <div class="assessment-inline-builder">
    <div
      v-if="forms.length"
      class="assessment-inline-builder__list"
    >
      <AssessmentEditorQuestion
        v-for="(form, index) in forms"
        :key="`question-form-${index}`"
        :draft="form"
        :number="existingCount + index + 1"
        :prompt-id="`assessment-new-question-${index}-prompt`"
        :points-id="`assessment-new-question-${index}-points`"
        :error="errors[index] || ''"
        :removable="canRemoveForm(form)"
        :allow-option-removal="allowOptionRemoval"
        :saving="saving"
        @update="updateForm(index, $event)"
        @remove="$emit('remove-form', index)"
        @prompt-paste="$emit('prompt-paste', index, $event)"
        @option-change="(optionIndex, value) => $emit('option-change', index, optionIndex, value)"
        @option-paste="(optionIndex, event) => $emit('option-paste', index, optionIndex, event)"
        @select-correct="$emit('select-correct', index, $event)"
        @add-option="$emit('add-option', index)"
        @remove-option="$emit('remove-option', index, $event)"
      />
    </div>
    <div class="assessment-inline-builder__actions">
      <v-menu location="bottom start">
        <template #activator="{ props }">
          <AppButton
            variant="secondary"
            class="assessment-inline-builder__add"
            :disabled="saving"
            v-bind="props"
          >
            {{ isTasksPage ? 'إضافة مهمة أدائية' : 'إضافة سؤال' }}
          </AppButton>
        </template>
        <div
          class="assessment-inline-builder__menu"
          aria-label="نوع السؤال الجديد"
        >
          <AppButton
            variant="plain"
            class="assessment-inline-builder__menu-item"
            @click="$emit('add-question', 'multiple')"
          >
            خيارات
          </AppButton>
          <AppButton
            variant="plain"
            class="assessment-inline-builder__menu-item"
            @click="$emit('add-question', 'text')"
          >
            نصي
          </AppButton>
          <AppButton
            variant="plain"
            class="assessment-inline-builder__menu-item"
            @click="$emit('add-question', 'truefalse')"
          >
            صح أو خطأ
          </AppButton>
          <AppButton
            v-if="canAddDocument"
            variant="plain"
            class="assessment-inline-builder__menu-item"
            @click="$emit('add-question', 'document')"
          >
            وورد
          </AppButton>
        </div>
      </v-menu>
      <AppButton
        variant="primary"
        :loading="saving"
        :disabled="saving"
        @click="$emit('save')"
      >
        {{ saving ? 'جارٍ الحفظ...' : 'حفظ الأسئلة' }}
      </AppButton>
    </div>
  </div>
</template>

<script>
import { AppButton } from '../ui';
import AssessmentEditorQuestion from './AssessmentEditorQuestion.vue';

export default {
  name: 'AssessmentQuestionBuilder',
  components: { AppButton, AssessmentEditorQuestion },
  props: {
    forms: { type: Array, default: () => [] },
    errors: { type: Array, default: () => [] },
    existingCount: { type: Number, default: 0 },
    isTasksPage: { type: Boolean, default: false },
    hasExistingQuestions: { type: Boolean, default: false },
    isDocumentMode: { type: Boolean, default: false },
    allowOptionRemoval: { type: Boolean, default: false },
    saving: { type: Boolean, default: false },
  },
  emits: ['remove-form', 'prompt-paste', 'select-correct', 'option-change', 'option-paste', 'add-option', 'remove-option', 'add-question', 'save', 'update-form', 'clear-error'],
  computed: {
    canAddDocument() { return this.isTasksPage && !this.hasExistingQuestions && !this.forms.length && !this.isDocumentMode; },
  },
  methods: {
    canRemoveForm(form) {
      return this.existingCount > 0 || this.forms.length > 1
        || Boolean(String(form.prompt || '').trim() || String(form.correctAnswer || '').trim())
        || (form.options || []).some(option => String(option).trim())
        || Number(form.points ?? 1) !== 1;
    },
    updateForm(index, patch) {
      this.$emit('update-form', index, patch);
      this.$emit('clear-error', index);
    },
  },
};
</script>

<style scoped>
.assessment-inline-builder { display: grid; margin-top: 16px; gap: 16px; }
.assessment-inline-builder__list { display: grid; gap: 16px; }
.assessment-inline-builder__actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
.assessment-inline-builder__actions > .app-button { flex: 1 1 120px; }
.assessment-inline-builder__menu { display: grid; min-width: 180px; padding: 4px; border: 1px solid var(--app-border); border-radius: var(--app-radius-card); background: var(--app-surface); box-shadow: var(--app-shadow-overlay); }
.assessment-inline-builder__actions .assessment-inline-builder__add { width: auto; height: auto; min-height: 48px; min-width: 0; padding: 8px 16px; border: 1px solid var(--app-border); border-radius: 8px; background: var(--app-surface); }
.assessment-inline-builder__menu .assessment-inline-builder__menu-item { min-height: 48px; padding: 8px 16px; text-align: start; justify-content: start; }
</style>
