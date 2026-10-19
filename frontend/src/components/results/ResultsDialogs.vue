<template>
  <div>
    <AppDialog
      :value="resultOpen"
      max-width="720"
      scrollable
      @input="$emit('update:result-open', $event)"
    >
      <div class="app-dialog results-detail-dialog">
        <AppDialogHeader
          :title="taskSection ? 'الإجابة' : `${resultTypeLabel}: ${selectedRow?.submission?.scoreOnly ? 'النتيجة' : 'الإجابة'}`"
          closable
          initial-focus
          @close="$emit('close-result')"
        />

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
            <AppButton
              type="button"
              class="results-score-editor__save-btn"
              :disabled="saving"
              @click="$emit('save-score')"
            >
              {{ saving ? 'جارٍ الحفظ...' : 'حفظ الدرجة' }}
            </AppButton>
          </div>
        </div>

        <div
          v-if="!selectedRow"
          class="results-empty-state results-empty-state--dialog"
        >
          لا توجد تفاصيل متاحة لهذه النتيجة.
        </div>
        <AppDialogBody
          v-else
          class="results-detail-dialog__body"
          :class="{ 'results-detail-dialog__body--tasks': taskSection }"
        >
          <p
            v-if="selectedRow.submission?.scoreOnly"
            class="results-empty-state"
          >
            الدرجة: {{ selectedRow.scoreLabel }}. أُدخلت يدويًا دون إجابات.
          </p>
          <article
            v-for="detail in (resultOpen ? detailCards : [])"
            :key="detail.key"
            class="results-answer-card"
          >
            <div
              v-if="detail.prompt && !detail.studentAnswerHtml && !(taskSection && detail.prompt === 'إرفاق ملف المهمة الأدائية')"
              class="results-answer-card__question"
            >
              {{ detail.index }}. {{ detail.prompt }}
              <span
                v-if="!detail.requiresManualReview"
                class="results-answer-card__points"
              >الدرجة: {{ detail.points }}</span>
            </div>
            <div
              v-if="!detail.hideCorrectAnswer"
              class="results-answer-card__line results-answer-card__line--correct"
            >
              الإجابة الصحيحة: {{ detail.correctAnswer }}
            </div>
            <div
              v-if="detail.statusText && !detail.requiresManualReview"
              class="results-answer-card__status"
              :class="detail.requiresManualReview
                ? 'results-answer-card__status--manual'
                : (detail.isCorrect ? 'results-answer-card__status--correct' : 'results-answer-card__status--incorrect')"
            >
              {{ detail.statusText }}
            </div>
            <DocumentAnswerPreview
              v-if="detail.studentAnswerHtml"
              :value="detail.studentAnswerHtml"
              :file-name="`إجابة ${selectedRow.name || 'المعلم'} - ${sectionLabel || 'المهمة'}.pdf`"
            />
            <div
              v-else-if="detail.answerText || !detail.attachment"
              class="results-answer-card__line results-answer-card__line--student"
            >
              {{ detail.answerText || detail.studentAnswer }}
            </div>
            <AttachmentContent
              v-if="detail.attachment"
              :attachment="detail.attachment"
            />
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
                <AppButton
                  type="button"
                  class="results-answer-review__save"
                  :disabled="!detail.answerId || savingAnswerId === detail.answerId"
                  @click="$emit('save-answer-score', detail)"
                >
                  {{ savingAnswerId === detail.answerId ? 'جارٍ الحفظ...' : 'حفظ الدرجة' }}
                </AppButton>
              </div>
              <div
                v-if="!detail.answerId"
                class="results-answer-review__hint"
              >
                لا توجد إجابة محفوظة لتصحيحها.
              </div>
            </div>
          </article>
          <div
            v-if="taskSection && selectedRow && selectedRow.submission"
            class="results-score-editor results-task-review"
          >
            <span class="results-score-editor__label">حالة المهمة</span>
            <div class="results-score-editor__controls">
              <AppButton
                v-for="action in reviewActions"
                :key="action.value"
                type="button"
                variant="secondary"
                class="results-task-review__button"
                :class="[
                  `results-task-review__button--${action.className}`,
                  { 'results-task-review__button--active': selectedRow.submission.taskReviewStatus === action.value },
                ]"
                :disabled="saving"
                :aria-pressed="selectedRow.submission.taskReviewStatus === action.value"
                @click="$emit('review-task', action.value)"
              >
                {{ action.label }}
              </AppButton>
            </div>
          </div>
        </AppDialogBody>
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
        <p class="results-delete-dialog__text">
          ستُحذف الأسئلة والإجابات والنتائج والمرفقات المرتبطة نهائيًا. لا يمكن التراجع.
        </p>
        <AppActionBar class="results-delete-dialog__actions">
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
        </AppActionBar>
      </div>
    </AppDialog>
  </div>
</template>

<script>
import DocumentAnswerPreview from './DocumentAnswerPreview.vue';
import { AppActionBar, AppButton, AppDialog, AppDialogBody, AppDialogHeader } from '../ui';
import AttachmentContent from '../tasks/AttachmentContent.vue';

export default {
  name: 'ResultsDialogs',
  components: { AppActionBar, AppButton, AppDialog, AppDialogBody, AppDialogHeader, DocumentAnswerPreview, AttachmentContent },
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

<style scoped src="../../styles/components/results-answer-dialog.css"></style>
