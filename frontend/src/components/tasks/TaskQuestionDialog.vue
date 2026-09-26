<template>
  <AppDialog
    :value="value"
    max-width="780"
    scrollable
    @input="$emit('input', $event)"
  >
    <div class="app-dialog">
      <AppDialogHeader title="إضافة أسئلة" />
      <AppDialogBody>
        <article
          v-for="(form, formIndex) in forms"
          :key="`task-question-form-${formIndex}`"
          class="assessment-form-card task-question-form"
        >
          <div class="assessment-form-card__topline">
            <strong>السؤال {{ formIndex + 1 }}</strong>
            <AppIconButton
              v-if="forms.length > 1"
              variant="danger"
              size="sm"
              :aria-label="`حذف السؤال ${formIndex + 1}`"
              @click="$emit('remove-form', formIndex)"
            >
              <v-icon aria-hidden="true">
                mdi-delete-outline
              </v-icon>
            </AppIconButton>
          </div>

          <div class="task-question-form__types">
            <AppChoiceButton
              v-for="type in questionTypes"
              :key="type.value"
              :active="form.type === type.value"
              @click="$emit('change-type', formIndex, type.value)"
            >
              {{ type.label }}
            </AppChoiceButton>
          </div>

          <textarea
            v-if="formIndex === 0"
            :value="pasteText"
            class="assessment-dialog__paste"
            aria-label="استيراد الأسئلة"
            placeholder="الصق الأسئلة هنا وسيتم تقسيمها تلقائيًا"
            @input="$emit('update:paste-text', $event.target.value)"
            @paste="$emit('bulk-paste', $event)"
          />

          <label :for="fieldId(formIndex, 'prompt')">السؤال</label>
          <input
            :id="fieldId(formIndex, 'prompt')"
            :value="form.prompt"
            type="text"
            class="assessment-input"
            placeholder="اكتب السؤال"
            @input="updateForm(formIndex, { prompt: $event.target.value }, true)"
          >

          <template v-if="form.type === 'multiple'">
            <label :for="fieldId(formIndex, 'option-0')">الخيارات</label>
            <div class="assessment-options-grid">
              <div
                v-for="(option, optionIndex) in form.options"
                :key="`${formIndex}-${optionIndex}`"
                class="assessment-options-grid__item"
              >
                <input
                  :id="fieldId(formIndex, `option-${optionIndex}`)"
                  :value="option"
                  type="text"
                  class="assessment-input"
                  :aria-label="`الخيار ${optionIndex + 1} للسؤال ${formIndex + 1}`"
                  :placeholder="`الخيار ${optionIndex + 1}`"
                  @input="$emit('option-change', formIndex, optionIndex, $event.target.value)"
                  @paste="$emit('option-paste', formIndex, optionIndex, $event)"
                >
                <AppIconButton
                  v-if="optionIndex === form.options.length - 1"
                  variant="primary"
                  aria-label="إضافة خيار"
                  @click="$emit('add-option', formIndex)"
                >
                  <v-icon
                    small
                    aria-hidden="true"
                  >
                    mdi-plus
                  </v-icon>
                </AppIconButton>
              </div>
            </div>
          </template>

          <div class="task-question-form__grid">
            <div>
              <label :for="fieldId(formIndex, 'points')">الدرجة</label>
              <input
                :id="fieldId(formIndex, 'points')"
                :value="form.points"
                type="number"
                min="0"
                class="assessment-input"
                @input="updateForm(formIndex, { points: $event.target.value })"
              >
            </div>
            <div>
              <label :for="fieldId(formIndex, 'answer')">الإجابة الصحيحة</label>
              <AppNativeSelect
                v-if="form.type !== 'text'"
                :id="fieldId(formIndex, 'answer')"
                :value="form.correctAnswer || (form.type === 'truefalse' ? 'صح' : '')"
                @change="updateForm(formIndex, { correctAnswer: $event.target.value })"
              >
                <option value="">
                  اختر
                </option>
                <option
                  v-for="answer in availableAnswers(form)"
                  :key="answer"
                  :value="answer"
                >
                  {{ answer }}
                </option>
              </AppNativeSelect>
              <input
                v-else
                :id="fieldId(formIndex, 'answer')"
                :value="form.correctAnswer"
                type="text"
                class="assessment-input"
                @input="updateForm(formIndex, { correctAnswer: $event.target.value })"
              >
            </div>
            <div>
              <label :for="fieldId(formIndex, 'file')">إرفاق ملف</label>
              <AppNativeSelect
                :id="fieldId(formIndex, 'file')"
                :value="form.allowFile"
                @change="updateForm(formIndex, { allowFile: $event.target.value })"
              >
                <option value="yes">
                  يسمح
                </option>
                <option value="no">
                  لا يسمح
                </option>
              </AppNativeSelect>
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

        <AppButton
          variant="plain"
          @click="$emit('add-form')"
        >
          إضافة سؤال
        </AppButton>
      </AppDialogBody>
      <AppDialogFooter>
        <AppButton
          variant="secondary"
          @click="$emit('input', false)"
        >
          إلغاء
        </AppButton>
        <AppButton
          variant="primary"
          @click="$emit('save')"
        >
          حفظ {{ forms.length > 1 ? `(${forms.length} أسئلة)` : '' }}
        </AppButton>
      </AppDialogFooter>
    </div>
  </AppDialog>
</template>

<script>
import {
  AppButton, AppChoiceButton, AppDialog, AppDialogBody, AppDialogFooter,
  AppDialogHeader, AppIconButton, AppNativeSelect,
} from '../ui';

export default {
  name: 'TaskQuestionDialog',
  components: {
    AppButton, AppChoiceButton, AppDialog, AppDialogBody, AppDialogFooter,
    AppDialogHeader, AppIconButton, AppNativeSelect,
  },
  props: {
    value: { type: Boolean, default: false },
    forms: { type: Array, default: () => [] },
    errors: { type: Array, default: () => [] },
    pasteText: { type: String, default: '' },
  },
  emits: [
    'add-form',
    'add-option',
    'bulk-paste',
    'change-type',
    'clear-error',
    'input',
    'option-change',
    'option-paste',
    'remove-form',
    'save',
    'update-form',
    'update:paste-text',
  ],
  data: () => ({
    questionTypes: [
      { value: 'truefalse', label: 'صح وخطأ' },
      { value: 'text', label: 'نصي' },
      { value: 'multiple', label: 'خيارات' },
    ],
  }),
  methods: {
    fieldId(formIndex, field) {
      return `task-question-${formIndex}-${field}`;
    },
    availableAnswers(form) {
      return form.type === 'truefalse' ? ['صح', 'خطأ'] : form.options.map(option => option.trim()).filter(Boolean);
    },
    updateForm(index, patch, clearError = false) {
      this.$emit('update-form', index, patch);
      if (clearError) this.$emit('clear-error', index);
    },
  },
};
</script>

<style scoped>
.task-question-form { display: grid; gap: 14px; }
.task-question-form__types { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.task-question-form__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.task-question-form__grid > div { display: grid; gap: 8px; }
label, strong { color: #0f172a; font-weight: 800; }
@media (max-width: 700px) {
  .task-question-form__types, .task-question-form__grid { grid-template-columns: 1fr; }
}
</style>
