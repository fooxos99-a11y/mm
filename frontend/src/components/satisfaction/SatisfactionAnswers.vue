<template>
  <dl class="satisfaction-responses__answers">
    <div
      v-for="answer in answers"
      :key="answer.key"
      class="satisfaction-responses__answer"
      :class="{ 'satisfaction-responses__answer--compact': !showPrompt }"
    >
      <dt :class="{ 'satisfaction-responses__prompt--hidden': !showPrompt }">
        {{ answer.prompt }}
      </dt>
      <dd>
        <p
          v-if="answer.ratingValue !== null"
          class="satisfaction-responses__rating"
        >
          التقييم: <bdi dir="ltr">{{ answer.ratingValue }} / 10</bdi>
        </p>
        <p
          v-if="answer.textValue.trim()"
          class="satisfaction-responses__text"
        >
          {{ answer.textValue }}
        </p>
        <p
          v-if="!answer.answered"
          class="satisfaction-responses__muted"
        >
          لا توجد إجابة لهذا السؤال.
        </p>
      </dd>
    </div>
  </dl>
</template>

<script>
export default {
  name: 'SatisfactionAnswers',
  props: {
    answers: { type: Array, default: () => [] },
    showPrompt: { type: Boolean, default: true },
  },
};
</script>

<style scoped src="../../styles/components/satisfaction-answers.css"></style>
