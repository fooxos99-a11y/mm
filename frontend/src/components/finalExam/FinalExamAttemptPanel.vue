<template>
  <section
    class="final-exam-attempt"
    aria-labelledby="final-exam-questions-title"
  >
    <h2
      id="final-exam-questions-title"
      class="assessment-section-title"
    >
      أجب على الأسئلة التالية:
    </h2>
    <FinalExamQuestionCard
      v-for="(question, index) in questions"
      :key="`${question.id}-${resetKey}`"
      :question="question"
      :index="index"
    >
      <template #tools>
        <div class="assessment-question__tools">
          <label
            v-if="question.allowFile"
            :for="`final-question-file-${question.id}`"
            class="assessment-pill-button"
          >
            إرفاق ملف
          </label>
          <input
            v-if="question.allowFile"
            :id="`final-question-file-${question.id}`"
            type="file"
            class="assessment-file-input"
            @change="$emit('select-file', question.id, $event)"
          >
          <AppButton
            v-if="question.attachmentDataUrl"
            variant="secondary"
            class="assessment-pill-button assessment-pill-button--ghost"
            @click="$emit('preview', questionAttachment(question))"
          >
            عرض المحتوى
          </AppButton>
          <AppButton
            v-if="files[question.id]?.dataUrl"
            variant="secondary"
            class="assessment-pill-button assessment-pill-button--ghost"
            @click="$emit('preview', files[question.id])"
          >
            معاينة المرفق
          </AppButton>
        </div>
      </template>

      <AssessmentQuestionAnswer
        :question="question"
        :model-value="answers[question.id] || ''"
        @update:model-value="$emit('answer', question.id, $event)"
      />
      <div
        v-if="files[question.id]?.name"
        class="assessment-question__file-name"
      >
        تم اختيار: {{ files[question.id].name }}
      </div>
    </FinalExamQuestionCard>

    <div class="assessment-submit-row">
      <AppButton
        variant="primary"
        class="assessment-submit-button"
        :loading="submitting"
        :disabled="submitting || !enabled"
        @click="$emit('submit')"
      >
        إرسال
      </AppButton>
    </div>
  </section>
</template>

<script>
import { AppButton } from '../ui';
import AssessmentQuestionAnswer from '../assessment/AssessmentQuestionAnswer.vue';
import FinalExamQuestionCard from './FinalExamQuestionCard.vue';

export default {
  name: 'FinalExamAttemptPanel',
  components: { AppButton, AssessmentQuestionAnswer, FinalExamQuestionCard },
  props: {
    questions: { type: Array, default: () => [] },
    answers: { type: Object, default: () => ({}) },
    files: { type: Object, default: () => ({}) },
    resetKey: { type: Number, default: 0 },
    submitting: { type: Boolean, default: false },
    enabled: { type: Boolean, default: false },
  },
  emits: ['select-file', 'preview', 'answer', 'submit'],
  methods: {
    questionAttachment(question) {
      return {
        name: question.attachmentName,
        type: question.attachmentType,
        dataUrl: question.attachmentDataUrl,
      };
    },
  },
};
</script>

<style scoped src="../../styles/components/final-exam-attempt-panel.css"></style>
