<template>
  <section
    class="final-exam-review"
    aria-labelledby="final-exam-review-title"
  >
    <h2
      id="final-exam-review-title"
      class="assessment-section-title"
    >
      مراجعة الإجابات
    </h2>
    <FinalExamQuestionCard
      v-for="(question, index) in questions"
      :key="`${question.id}-review`"
      :question="question"
      :index="index"
    >
      <div class="assessment-review__answer">
        {{ answer(question.id) || '—' }}
      </div>
      <div
        v-if="question.correctAnswer"
        class="assessment-review__meta"
        :class="`assessment-review__meta--${presentation(question).modifier}`"
      >
        {{ presentation(question).label }}
      </div>
    </FinalExamQuestionCard>
  </section>
</template>

<script>
import {
  finalExamReviewPresentation,
  submittedFinalExamAnswer,
} from '../../features/finalExam/publicFinalExamModel.mjs';
import FinalExamQuestionCard from './FinalExamQuestionCard.vue';

export default {
  name: 'FinalExamReviewPanel',
  components: { FinalExamQuestionCard },
  props: {
    questions: { type: Array, default: () => [] },
    submission: { type: Object, required: true },
  },
  methods: {
    answer(questionId) {
      return submittedFinalExamAnswer(this.submission, questionId);
    },
    presentation(question) {
      return finalExamReviewPresentation(question, this.submission);
    },
  },
};
</script>

<style scoped src="../../styles/components/final-exam-review-panel.css"></style>
