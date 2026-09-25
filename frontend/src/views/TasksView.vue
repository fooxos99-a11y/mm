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
        :source="previewAttachmentSource"
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
            المهمة الأدائية
          </div>
          <div class="assessment-hero__badge">
            {{ selectedTask ? selectedTask.title : 'المهمة الأدائية' }}
          </div>
        </div>

        <div
          v-if="selectedTaskSummary"
          class="assessment-hero__summary"
        >
          {{ selectedTaskSummary }}
        </div>

        <v-card
          class="assessment-shell pa-4 pa-sm-6 pa-md-8"
          elevation="0"
        >
          <div
            v-if="publicLoading && !publicSnapshot"
            class="assessment-empty-state"
          >
            جارٍ تحميل البيانات...
          </div>
          <div
            v-else-if="publicError"
            class="assessment-error-state"
          >
            <div class="assessment-alert assessment-alert--error">
              {{ publicError }}
            </div>
            <AppButton
              variant="secondary"
              class="mt-4"
              @click="loadPublicData"
            >
              إعادة المحاولة
            </AppButton>
          </div>
          <div
            v-else-if="!studentResolved"
            class="assessment-empty-state"
          >
            جارٍ التحقق من بيانات الطالب...
          </div>
          <div
            v-else-if="tasks.length === 0"
            class="assessment-empty-state"
          >
            لا توجد مهام مفعلة حاليًا.
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
              v-if="selectedTask && student && !taskIsEnabled"
              class="assessment-empty-state"
            >
              لا توجد بيانات لهذه المهمة حاليًا.
            </div>

            <div
              v-if="existingSubmission"
              class="assessment-state assessment-state--success"
            >
              <div class="assessment-state__title">
                تم الإرسال
              </div>
            </div>

            <template v-else-if="selectedTask">
              <div
                v-if="currentTaskVideo"
                class="task-video-card"
              >
                <div class="task-video-card__title">
                  الفيديو
                </div>
                <iframe
                  v-if="currentTaskVideo.kind === 'embed'"
                  :src="currentTaskVideo.src"
                  class="task-video-card__frame"
                  title="فيديو المهمة الأدائية"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowfullscreen
                />
                <video
                  v-else
                  :src="currentTaskVideo.src"
                  controls
                  playsinline
                  class="task-video-card__frame"
                />
              </div>

              <div
                v-if="selectedTask.taskMode === 'document'"
                class="task-document-layout"
              >
                <div class="task-editor-shell">
                  <RichTextEditor
                    :value="documentAnswer"
                    :protected-content="selectedTaskTemplateContent"
                    :lock-images="true"
                    :allow-protected-editing="true"
                    :disabled="Boolean(existingSubmission || !taskIsEnabled)"
                    min-height="420px"
                    @input="setDocumentAnswer"
                  />
                </div>
              </div>

              <template v-else>
                <div class="assessment-section-title">
                  أجب على الأسئلة التالية:
                </div>
                <article
                  v-for="(question, index) in taskQuestions"
                  :key="`${question.id}-${selectedTaskId}`"
                  class="assessment-question"
                >
                  <div class="assessment-question__header">
                    <div class="assessment-question__title">
                      {{ index + 1 }}. {{ question.prompt }}
                    </div>
                    <div class="assessment-question__tools">
                      <label
                        v-if="question.allowFile"
                        :for="`task-file-${question.id}`"
                        class="assessment-pill-button"
                      >
                        إرفاق ملف
                      </label>
                      <input
                        v-if="question.allowFile"
                        :id="`task-file-${question.id}`"
                        type="file"
                        class="assessment-file-input"
                        @change="handleFileSelect(question.id, $event)"
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
                        v-if="files[question.id]?.previewUrl"
                        variant="secondary"
                        class="assessment-pill-button assessment-pill-button--ghost"
                        @click="openAttachmentPreview(files[question.id])"
                      >
                        معاينة المرفق
                      </AppButton>
                    </div>
                  </div>

                  <div
                    v-if="question.type === 'multiple' || question.type === 'truefalse'"
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
                v-if="canSubmit"
                class="assessment-submit-row"
              >
                <AppButton
                  variant="primary"
                  class="assessment-submit-button"
                  :loading="submitting"
                  :disabled="submitting || !taskIsEnabled"
                  @click="handleSubmit"
                >
                  إرسال
                </AppButton>
              </div>
            </template>
          </template>
        </v-card>
      </div>
    </v-container>
  </div>
</template>

<script src="../features/tasks/tasksView.js"></script>

<style scoped src="../styles/views/tasks-view.css"></style>
<style scoped src="../styles/views/tasks-view-responsive.css"></style>
