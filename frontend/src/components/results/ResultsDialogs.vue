<template>
  <div>
    <AppDialog
      :value="resultOpen"
      max-width="980"
      scrollable
      @input="$emit('update:result-open', $event)"
    >
      <div class="results-detail-dialog">
        <div class="results-detail-dialog__header">
          <div v-if="!taskSection">
            <div class="results-detail-dialog__eyebrow">
              {{ sectionLabel }}
            </div>
            <div class="results-detail-dialog__title">
              {{ resultTypeLabel }}: الإجابة
            </div>
          </div>
          <div class="results-detail-dialog__actions">
            <AppRawButton
              v-if="taskSection && selectedRow && selectedRow.submission"
              type="button"
              class="results-detail-dialog__download-btn"
              title="تحميل PDF"
              @click="$emit('download')"
            >
              <v-icon small>
                mdi-file-pdf-box
              </v-icon>
              تحميل PDF
            </AppRawButton>
            <AppRawButton
              type="button"
              class="results-detail-dialog__close"
              @click="$emit('close-result')"
            >
              <v-icon small>
                mdi-close
              </v-icon>
            </AppRawButton>
          </div>
        </div>

        <div
          v-if="finalExamSection && selectedRow && selectedRow.submission && !hasManualReviewAnswers"
          class="results-score-editor"
        >
          <label
            class="results-score-editor__label"
            for="results-score-editor-input"
          >الدرجة</label>
          <div class="results-score-editor__controls">
            <input
              id="results-score-editor-input"
              :value="scoreValue"
              type="number"
              min="0"
              class="results-score-editor__input"
              :placeholder="totalPoints ? String(totalPoints) : '0'"
              @input="$emit('update:score-value', $event.target.value)"
              @keydown.enter="$emit('save-score')"
            >
            <span
              v-if="totalPoints"
              class="results-score-editor__total"
            >/ {{ totalPoints }}</span>
            <AppRawButton
              type="button"
              class="results-score-editor__save-btn"
              :disabled="saving"
              @click="$emit('save-score')"
            >
              {{ saving ? 'جارٍ الحفظ...' : 'حفظ الدرجة' }}
            </AppRawButton>
          </div>
        </div>

        <div
          v-if="taskSection && selectedRow && selectedRow.submission"
          class="results-score-editor results-task-review"
        >
          <span class="results-score-editor__label">حالة المهمة</span>
          <div class="results-score-editor__controls">
            <AppRawButton
              v-for="action in reviewActions"
              :key="action.value"
              type="button"
              class="results-task-review__button"
              :class="[
                `results-task-review__button--${action.className}`,
                { 'results-task-review__button--active': selectedRow.submission.taskReviewStatus === action.value },
              ]"
              :disabled="saving"
              @click="$emit('review-task', action.value)"
            >
              {{ action.label }}
            </AppRawButton>
          </div>
        </div>

        <div
          v-if="!selectedRow"
          class="results-empty-state results-empty-state--dialog"
        >
          لا توجد تفاصيل متاحة لهذه النتيجة.
        </div>
        <div
          v-else
          class="results-detail-dialog__body"
          :class="{ 'results-detail-dialog__body--tasks': taskSection }"
        >
          <article
            v-for="detail in detailCards"
            :key="detail.key"
            class="results-answer-card"
          >
            <div
              v-if="detail.prompt"
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
            <div
              v-if="detail.statusText"
              class="results-answer-card__status"
              :class="detail.requiresManualReview
                ? 'results-answer-card__status--manual'
                : (detail.isCorrect ? 'results-answer-card__status--correct' : 'results-answer-card__status--incorrect')"
            >
              {{ detail.statusText }}
            </div>
            <div
              v-if="detail.studentAnswerHtml"
              class="results-answer-card__document"
            >
              <div
                v-if="!taskSection"
                class="results-answer-card__answer-label results-answer-card__answer-label--student"
              >
                إجابة المعلم
              </div>
              <RichTextDocumentView
                :value="detail.studentAnswerHtml"
                :min-height="taskSection ? '0' : '420px'"
              />
            </div>
            <div
              v-else
              class="results-answer-card__line results-answer-card__line--student"
            >
              إجابة المعلم: {{ detail.studentAnswer }}
            </div>
            <AppRawButton
              v-if="detail.attachment"
              type="button"
              class="results-answer-card__attachment"
              @click="$emit('preview-attachment', detail.attachment)"
            >
              <v-icon small>
                mdi-paperclip
              </v-icon>
              {{ detail.attachment.fileName }}
            </AppRawButton>
            <div
              v-if="detail.requiresManualReview"
              class="results-answer-review"
            >
              <label
                class="results-answer-review__label"
                :for="`answer-score-${detail.answerId || detail.index}`"
              >درجة الإجابة</label>
              <div class="results-answer-review__controls">
                <input
                  :id="`answer-score-${detail.answerId || detail.index}`"
                  :value="answerScoreValues[detail.answerId]"
                  type="number"
                  min="0"
                  :max="detail.points"
                  step="0.5"
                  class="results-answer-review__input"
                  :disabled="!detail.answerId || savingAnswerId === detail.answerId"
                  @input="$emit('update-answer-score', { answerId: detail.answerId, value: $event.target.value })"
                  @keydown.enter="$emit('save-answer-score', detail)"
                >
                <span class="results-answer-review__total">/ {{ detail.points }}</span>
                <AppRawButton
                  type="button"
                  class="results-answer-review__save"
                  :disabled="!detail.answerId || savingAnswerId === detail.answerId"
                  @click="$emit('save-answer-score', detail)"
                >
                  {{ savingAnswerId === detail.answerId ? 'جارٍ الحفظ...' : 'حفظ الدرجة' }}
                </AppRawButton>
              </div>
              <div
                v-if="!detail.answerId"
                class="results-answer-review__hint"
              >
                لا توجد إجابة محفوظة لتصحيحها.
              </div>
            </div>
          </article>
        </div>
      </div>
    </AppDialog>

    <AppDialog
      :value="deleteOpen"
      max-width="520"
      @input="$emit('update:delete-open', $event)"
    >
      <div class="results-delete-dialog">
        <h2 class="results-delete-dialog__title">
          {{ deleteEntityLabel === 'مهمة' ? 'تأكيد حذف المهمة' : 'تأكيد حذف الدورة' }}
        </h2>
        <p class="results-delete-dialog__text">
          هل أنت متأكد من حذف {{ deleteEntityLabel }}
          <strong>{{ deleteTitle || 'المحددة' }}</strong>؟
        </p>
        <div class="results-delete-dialog__actions">
          <AppButton
            variant="secondary"
            @click="$emit('close-delete')"
          >
            إلغاء
          </AppButton>
          <AppButton
            variant="danger"
            :loading="deleting"
            @click="$emit('confirm-delete')"
          >
            {{ deleting ? 'جارٍ الحذف...' : 'حذف' }}
          </AppButton>
        </div>
      </div>
    </AppDialog>
  </div>
</template>

<script>
import RichTextDocumentView from '../RichTextDocumentView.vue';
import { AppButton, AppDialog, AppRawButton } from '../ui';

export default {
  name: 'ResultsDialogs',
  components: { AppButton, AppDialog, AppRawButton, RichTextDocumentView },
  props: {
    resultOpen: Boolean,
    deleteOpen: Boolean,
    taskSection: Boolean,
    finalExamSection: Boolean,
    selectedRow: { type: Object, default: null },
    detailCards: { type: Array, default: () => [] },
    sectionLabel: { type: String, default: '' },
    resultTypeLabel: { type: String, default: '' },
    totalPoints: { type: Number, default: 0 },
    scoreValue: { type: [Number, String], default: null },
    answerScoreValues: { type: Object, default: () => ({}) },
    savingAnswerId: { type: String, default: '' },
    hasManualReviewAnswers: Boolean,
    saving: Boolean,
    deleteEntityLabel: { type: String, default: 'دورة' },
    deleteTitle: { type: String, default: '' },
    deleting: Boolean,
  },
  emits: [
    'close-delete',
    'close-result',
    'confirm-delete',
    'download',
    'preview-attachment',
    'review-task',
    'save-answer-score',
    'save-score',
    'update-answer-score',
    'update:delete-open',
    'update:result-open',
    'update:score-value',
  ],
  data: () => ({
    reviewActions: [
      { value: 'approved', label: 'اعتماد', className: 'approve' },
      { value: 'rejected', label: 'رفض', className: 'reject' },
    ],
  }),
};
</script>
