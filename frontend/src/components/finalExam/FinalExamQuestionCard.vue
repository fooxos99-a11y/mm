<template>
  <article class="assessment-question">
    <div class="assessment-question__header">
      <div class="assessment-question__title">
        {{ index + 1 }}. {{ question.prompt }}
      </div>
      <slot name="tools" />
    </div>
    <slot />
  </article>
</template>

<script>
export default {
  name: 'FinalExamQuestionCard',
  props: {
    question: { type: Object, required: true },
    index: { type: Number, required: true },
  },
};
</script>

<style scoped src="../../styles/components/final-exam-question-card.css"></style>
