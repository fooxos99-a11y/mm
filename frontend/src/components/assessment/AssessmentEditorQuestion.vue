<template>
  <article
    :id="`editor-${promptId}`"
    class="assessment-editor-question"
    :aria-label="`السؤال ${number}`"
    :aria-describedby="error ? errorId : undefined"
  >
    <header class="assessment-editor-question__header">
      <div class="assessment-editor-question__identity">
        <span class="assessment-editor-question__number">{{ number }}</span>
        <h2 class="assessment-editor-question__title">
          السؤال {{ number }}
        </h2>
        <span class="assessment-editor-question__type">{{ typeLabel }}</span>
      </div>
      <AppButton
        v-if="removable && canEdit"
        variant="secondary"
        class="assessment-editor-question__delete"
        :aria-label="`حذف السؤال ${number}`"
        :disabled="saving"
        @click="$emit('remove')"
      >
        حذف
      </AppButton>
    </header>
    <div class="assessment-editor-question__fields">
      <AppInput
        :id="promptId"
        :value="draft.prompt || ''"
        label="نص السؤال"
        placeholder="اكتب السؤال"
        multiline
        auto-resize
        :rows="2"
        class="assessment-editor-question__input"
        :disabled="!canEdit || saving"
        @input="$emit('update', { prompt: $event })"
        @paste="$emit('prompt-paste', $event)"
      />
      <AppInput
        :id="pointsId"
        :value="draft.points ?? '1'"
        label="الدرجة"
        type="number"
        min="0"
        inputmode="decimal"
        class="assessment-editor-question__points"
        :disabled="!canEdit || saving"
        @input="$emit('update', { points: $event })"
      />
    </div>
    <fieldset
      v-if="draft.type === 'multiple'"
      class="assessment-editor-question__options"
    >
      <legend class="d-sr-only">
        خيارات الإجابة
      </legend>
      <div
        v-for="(option, index) in draft.options || []"
        :key="index"
        class="assessment-editor-question__option"
        :class="{ 'assessment-editor-question__option--correct': isCorrect(option) }"
      >
        <AppIconButton
          :variant="isCorrect(option) ? 'primary' : 'neutral'"
          class="assessment-editor-question__correct"
          :aria-label="`تحديد الخيار ${index + 1} إجابة صحيحة`"
          :aria-pressed="isCorrect(option)"
          :disabled="!canEdit || saving || !String(option).trim()"
          @click="$emit('select-correct', index)"
        >
          <v-icon aria-hidden="true">
            mdi-check
          </v-icon>
        </AppIconButton>
        <AppInput
          :id="`${promptId}-option-${index}`"
          :value="option"
          multiline
          auto-resize
          :rows="1"
          class="assessment-editor-question__input"
          :aria-label="`الخيار ${index + 1} للسؤال ${number}`"
          :placeholder="`الخيار ${index + 1}`"
          :disabled="!canEdit || saving"
          @input="$emit('option-change', index, $event)"
          @paste="$emit('option-paste', index, $event)"
        />
        <AppIconButton
          v-if="allowOptionRemoval && canEdit && draft.options.length > 2"
          variant="danger"
          :aria-label="`حذف الخيار ${index + 1} للسؤال ${number}`"
          :disabled="saving"
          @click="$emit('remove-option', index)"
        >
          <v-icon aria-hidden="true">
            mdi-delete-outline
          </v-icon>
        </AppIconButton>
      </div>
      <AppButton
        v-if="canEdit"
        variant="secondary"
        class="assessment-editor-question__add-option"
        :disabled="saving"
        @click="$emit('add-option')"
      >
        إضافة خيار
      </AppButton>
    </fieldset>
    <p
      v-if="error"
      :id="errorId"
      class="assessment-editor-question__error"
      role="alert"
    >
      {{ error }}
    </p>
  </article>
</template>

<script>
import { AppButton, AppIconButton, AppInput } from '../ui';
import { isCorrectQuestionOption } from '../../features/assessmentQuestions/questionModel.mjs';

export default {
  name: 'AssessmentEditorQuestion',
  components: { AppButton, AppIconButton, AppInput },
  props: {
    draft: { type: Object, required: true },
    number: { type: Number, required: true },
    promptId: { type: String, required: true },
    pointsId: { type: String, required: true },
    error: { type: String, default: '' },
    canEdit: { type: Boolean, default: true },
    removable: { type: Boolean, default: true },
    allowOptionRemoval: { type: Boolean, default: false },
    saving: { type: Boolean, default: false },
  },
  emits: ['remove', 'update', 'prompt-paste', 'option-change', 'option-paste', 'select-correct', 'add-option', 'remove-option'],
  computed: {
    errorId() { return `${this.promptId}-error`; },
    typeLabel() {
      if (this.draft.type === 'text') return 'نصي';
      return (this.draft.options || []).length === 2 && this.draft.options.includes('صح') && this.draft.options.includes('خطأ')
        ? 'صح أو خطأ' : 'اختيار من متعدد';
    },
  },
  methods: { isCorrect(option) { return isCorrectQuestionOption(this.draft, option); } },
};
</script>

<style scoped>
.assessment-editor-question {
  min-width: 0; padding: var(--app-space-4); border: 1px solid var(--app-border);
  border-radius: var(--app-radius-card); background: var(--app-surface); box-shadow: none;
  scroll-margin-top: 120px;
}
.assessment-editor-question__header { display: flex; align-items: start; justify-content: space-between; gap: 8px; margin-bottom: 16px; }
.assessment-editor-question__identity { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; min-width: 0; }
.assessment-editor-question__identity h2 { margin: 0; color: var(--app-primary-dark); font-size: 1rem; }
.assessment-editor-question__number { display: grid; place-items: center; width: 32px; height: 32px; background: var(--app-primary-soft); color: var(--app-primary); border-radius: 8px; font-weight: 700; }
.assessment-editor-question__type { color: var(--app-text-muted); font-size: var(--app-font-sm); }
.assessment-editor-question .assessment-editor-question__delete { position: static; flex-shrink: 0; width: auto; min-width: 56px; min-height: 44px; padding: 8px; border: 1px solid var(--app-border); border-radius: 8px; color: var(--app-danger); white-space: nowrap; }
.assessment-editor-question__fields { display: grid; gap: 12px; }
.assessment-editor-question__fields > :last-child { max-width: 120px; }
.assessment-editor-question :deep(.assessment-editor-question__points) { text-align: center; }
.assessment-editor-question__error { color: var(--app-danger); font-size: var(--app-font-sm); margin: 12px 0 0; }
.assessment-editor-question :deep(.app-field__input) { min-height: 46px; padding: 8px 12px; border: 0; border-radius: 0; background: transparent; box-shadow: none; line-height: 1.5; }
.assessment-editor-question :deep(textarea) { overflow: hidden; resize: none; }
.assessment-editor-question__options { display: grid; gap: 8px; min-width: 0; padding: 0; margin-top: 16px; border: 0; }
.assessment-editor-question__option { display: flex; align-items: start; gap: 8px; min-width: 0; }
.assessment-editor-question__option > :deep(.app-field) { flex: 1; min-width: 0; }
.assessment-editor-question__option .app-icon-button { flex-shrink: 0; min-width: 48px; min-height: 48px; }
.assessment-editor-question__option--correct :deep(.app-field__control) { border-color: var(--app-primary); }
.assessment-editor-question__correct[aria-pressed="true"] { border-color: var(--app-primary); background: var(--app-primary); color: #fff; }
.assessment-editor-question .assessment-editor-question__add-option { justify-self: start; width: auto; min-height: 44px; padding: 8px 12px; border: 1px solid var(--app-border); border-radius: 8px; background: var(--app-surface); }
@media (min-width: 640px) { .assessment-editor-question__fields { grid-template-columns: minmax(0, 1fr) 104px; align-items: start; } }
</style>
