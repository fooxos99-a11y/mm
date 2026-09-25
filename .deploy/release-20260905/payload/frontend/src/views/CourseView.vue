<template>
  <div class="assessment-page">
    <div class="assessment-orbit assessment-orbit--large" />
    <div class="assessment-orbit assessment-orbit--medium" />
    <div class="assessment-orbit assessment-orbit--small" />
    <div class="assessment-glow" />
    <div class="assessment-grid" />
    <div class="assessment-top-shade" />
    <div class="assessment-radial assessment-radial--one" />
    <div class="assessment-radial assessment-radial--two" />

    <v-container class="assessment-page__container py-8 py-md-12">
      <AttachmentPreviewDialog
        :open="previewDialogOpen"
        :attachment="previewAttachment"
        :kind="previewKind"
        :source="previewAttachment?.dataUrl || ''"
        @update:open="previewDialogOpen = $event"
        @close="closePreview"
      />

      <div class="assessment-stage">
        <div class="assessment-hero">
          <img
            :src="$publicAsset('اللوقو-شفاف.webp')"
            alt="شعار برنامج رخصة ممارس"
            class="assessment-hero__logo"
          >
          <div class="assessment-hero__divider" />
          <div class="assessment-hero__eyebrow">
            {{ assessmentLabel }}
          </div>
          <div class="assessment-hero__badge">
            {{ activeCourse ? activeCourse.title : assessmentLabel }}
          </div>
        </div>

        <v-card
          class="assessment-shell pa-4 pa-sm-6 pa-md-8"
          elevation="0"
        >
          <div
            v-if="dashboardLoading && !dashboardSnapshot"
            class="assessment-empty-state"
          >
            جارٍ تحميل البيانات...
          </div>
          <div
            v-else-if="dashboardError"
            class="assessment-alert assessment-alert--error"
          >
            {{ dashboardError }}
          </div>
          <div
            v-else-if="!studentResolved"
            class="assessment-empty-state"
          >
            جارٍ التحقق من بيانات الطالب...
          </div>
          <div
            v-else-if="!activeCourse"
            class="assessment-empty-state"
          >
            لا توجد دورة مفعلة حاليًا، لذلك لا يمكن عرض الاختبار الآن.
          </div>
          <div
            v-else-if="!student"
            class="assessment-empty-state"
          >
            تعذر ربط هذا الحساب ببيانات الطالب أو المعلم.
          </div>
          <template v-else>
            <div
              v-if="pageError"
              class="assessment-alert assessment-alert--error"
            >
              {{ pageError }}
            </div>

            <div
              v-if="student && !isAssessmentEnabled"
              class="assessment-empty-state"
            >
              لا توجد بيانات لهذا الاختبار حاليًا.
            </div>

            <div
              v-if="existingSubmission && !hasPendingPostSatisfaction"
              class="assessment-state assessment-state--success"
            >
              <div class="assessment-state__title">
                تم الإرسال
              </div>
            </div>

            <div
              v-else-if="existingSubmission && hasPendingPostSatisfaction"
              class="assessment-state assessment-state--info"
            >
              <div class="assessment-state__title">
                تم الإرسال
              </div>
            </div>

            <template v-if="canInteractWithAssessment && questions.length">
              <div class="assessment-section-title">
                أجب على الأسئلة التالية:
              </div>

              <article
                v-for="(question, index) in questions"
                :key="`${question.id}-${resetKey}`"
                class="assessment-question"
              >
                <div class="assessment-question__header">
                  <div class="assessment-question__title">
                    {{ index + 1 }}. {{ question.prompt }}
                  </div>
                  <div class="assessment-question__tools">
                    <label
                      v-if="question.allowFile"
                      :for="`question-file-${question.id}`"
                      class="assessment-pill-button"
                    >
                      إرفاق ملف
                    </label>
                    <input
                      v-if="question.allowFile"
                      :id="`question-file-${question.id}`"
                      type="file"
                      class="assessment-file-input"
                      @change="handleStudentFileSelect(question.id, $event)"
                    >
                    <AppButton
                      v-if="question.attachmentDataUrl"
                      variant="secondary"
                      class="assessment-pill-button assessment-pill-button--ghost"
                      @click="openAttachmentPreview({
                        name: question.attachmentName,
                        type: question.attachmentType,
                        dataUrl: question.attachmentDataUrl,
                      })"
                    >
                      عرض المحتوى
                    </AppButton>
                    <AppButton
                      v-if="files[question.id]?.dataUrl"
                      variant="secondary"
                      class="assessment-pill-button assessment-pill-button--ghost"
                      @click="openAttachmentPreview(files[question.id])"
                    >
                      معاينة المرفق
                    </AppButton>
                  </div>
                </div>

                <div
                  v-if="question.type === 'multiple'"
                  class="assessment-options-grid"
                >
                  <AppChoiceButton
                    v-for="option in question.options"
                    :key="option"
                    block
                    class="assessment-option"
                    :class="{ 'assessment-option--active': answers[question.id] === option }"
                    :active="answers[question.id] === option"
                    @click="setAnswer(question.id, option)"
                  >
                    {{ option }}
                  </AppChoiceButton>
                </div>

                <v-textarea
                  v-else
                  :model-value="answers[question.id] || ''"
                  outlined
                  rows="5"
                  hide-details
                  class="assessment-textarea"
                  placeholder="اكتب إجابتك هنا"
                  @update:model-value="setAnswer(question.id, $event)"
                />

                <div
                  v-if="files[question.id]?.name"
                  class="assessment-question__file-name"
                >
                  تم اختيار: {{ files[question.id].name }}
                </div>
              </article>
            </template>

            <div
              v-if="resolvedAssessmentType === 'post' && student && satisfactionQuestions.length && !alreadySubmittedSatisfaction && (isAssessmentEnabled || existingSubmission)"
              class="assessment-satisfaction"
            >
              <div class="assessment-divider" />
              <div class="assessment-section-title">
                استبيان الرضا
              </div>

              <article
                v-for="(question, index) in satisfactionQuestions"
                :key="question.id"
                class="assessment-question"
              >
                <div class="assessment-question__header">
                  <div class="assessment-question__title">
                    {{ index + 1 }}. {{ question.prompt }}
                    <span
                      v-if="question.isRequired"
                      class="assessment-required"
                    >*</span>
                  </div>
                </div>

                <div
                  v-if="question.type === 'rating'"
                  class="assessment-rating-bar"
                >
                  <div class="assessment-rating-bar__labels">
                    <span>1</span>
                    <span class="assessment-rating-bar__value">
                      {{ satisfactionAnswers[question.id]?.ratingValue ?? 'غير محدد' }}
                    </span>
                    <span>10</span>
                  </div>
                  <v-slider
                    :model-value="satisfactionAnswers[question.id]?.ratingValue ?? 1"
                    min="1"
                    max="10"
                    step="1"
                    ticks="always"
                    tick-size="3"
                    hide-details
                    class="assessment-rating-bar__slider"
                    :class="{ 'assessment-rating-bar__slider--unanswered': satisfactionAnswers[question.id]?.ratingValue == null }"
                    @update:model-value="setSatisfactionRating(question.id, $event)"
                  />
                </div>

                <v-textarea
                  v-else
                  :model-value="satisfactionAnswers[question.id]?.textValue || ''"
                  outlined
                  rows="4"
                  hide-details
                  class="assessment-textarea"
                  placeholder="اكتب رأيك هنا"
                  @update:model-value="setSatisfactionText(question.id, $event)"
                />
              </article>
            </div>

            <div
              v-if="satisfactionError && (isAssessmentEnabled || existingSubmission)"
              class="assessment-alert assessment-alert--error"
            >
              {{ satisfactionError }}
            </div>

            <div
              v-if="canSubmitFlow && (questions.length || hasPendingPostSatisfaction)"
              class="assessment-submit-row"
            >
              <AppButton
                variant="primary"
                class="assessment-submit-button"
                :loading="submitting"
                :disabled="submitting || !isAssessmentEnabled"
                @click="handleSubmit"
              >
                إرسال
              </AppButton>
            </div>

            <div
              v-if="resolvedAssessmentType === 'post' && student && satisfactionQuestions.length && alreadySubmittedSatisfaction && (isAssessmentEnabled || existingSubmission)"
              class="assessment-alert assessment-alert--success"
            >
              شكرًا، تم استلام استبيان الرضا.
            </div>
          </template>
        </v-card>
      </div>
    </v-container>
  </div>
</template>

<script src="../features/course/courseView.js"></script>

<style scoped src="../styles/views/course-view.css"></style>
