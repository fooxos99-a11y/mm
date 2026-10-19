<template>
  <section :class="sectionClass">
    <section class="results-list-shell">
      <div class="results-list">
        <article class="results-entry">
          <div class="results-entry__actions">
            <AppRawButton
              type="button"
              class="results-entry__preview"
              :disabled="!submission"
              :aria-label="expanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'"
              @click="$emit('toggle')"
            >
              <v-icon small>
                {{ expanded ? 'mdi-eye-off-outline' : 'mdi-eye-outline' }}
              </v-icon>
            </AppRawButton>
            <span
              class="results-entry__score-pill"
              :class="{ 'results-entry__score-pill--empty': !submission }"
            >
              {{ scoreLabel }}
            </span>
          </div>

          <div class="results-entry__identity">
            <div class="results-entry__name">
              {{ title }}
            </div>
          </div>
        </article>

        <div
          v-if="expanded && submission"
          class="student-detail-stack"
        >
          <p
            v-if="submission.scoreOnly"
            class="results-empty-state"
          >
            أُدخلت النتيجة يدويًا دون إجابات.
          </p>
          <article
            v-for="detail in details"
            :key="detail.key"
            class="results-answer-card"
          >
            <div
              v-if="!detail.studentAnswerHtml"
              class="results-answer-card__question"
            >
              {{ detail.index }}. {{ detail.prompt }}
              <span class="results-answer-card__points">الدرجة: {{ detail.points }}</span>
            </div>
            <div
              v-if="!detail.hideCorrectAnswer"
              class="results-answer-card__line results-answer-card__line--correct"
            >
              الإجابة الصحيحة: {{ detail.correctAnswer }}
            </div>
            <DocumentAnswerPreview
              v-if="detail.studentAnswerHtml"
              :value="detail.studentAnswerHtml"
              :file-name="`إجابتي - ${title}.pdf`"
              label="إجابتك"
            />
            <div
              v-else
              class="results-answer-card__line results-answer-card__line--student"
            >
              إجابتك: {{ detail.studentAnswer }}
            </div>
            <div
              v-if="detail.statusText"
              class="results-answer-card__status"
              :class="detail.isCorrect ? 'results-answer-card__status--correct' : 'results-answer-card__status--incorrect'"
            >
              {{ detail.statusText }}
            </div>
          </article>
        </div>
      </div>
    </section>
  </section>
</template>

<script>
import DocumentAnswerPreview from '../results/DocumentAnswerPreview.vue';
import { AppRawButton } from '../ui';

export default {
  name: 'StudentResultEntry',
  components: { AppRawButton, DocumentAnswerPreview },
  props: {
    details: { type: Array, default: () => [] },
    expanded: { type: Boolean, default: false },
    scoreLabel: { type: String, default: '' },
    sectionClass: { type: String, default: '' },
    submission: { type: Object, default: null },
    title: { type: String, required: true },
  },
  emits: ['toggle'],
};
</script>
