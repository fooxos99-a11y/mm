<template>
  <div class="assessment-page final-exam-public">
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
            الاختبار النهائي
          </div>
          <div class="assessment-hero__badge">
            الاختبار النهائي
          </div>
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
            class="assessment-alert assessment-alert--error"
            role="alert"
          >
            {{ publicError }}
          </div>
          <div
            v-else-if="!studentResolved"
            class="assessment-empty-state"
          >
            جارٍ التحقق من بيانات الطالب...
          </div>
          <template v-else>
            <div
              v-if="pageError"
              class="assessment-alert assessment-alert--error"
              role="alert"
            >
              {{ pageError }}
            </div>
            <div
              v-if="!student"
              class="assessment-empty-state"
            >
              تعذر ربط هذا الحساب ببيانات الطالب أو المعلم.
            </div>
            <div
              v-if="student && !isEnabled"
              class="assessment-empty-state"
            >
              لا توجد بيانات لهذا الاختبار حاليًا.
            </div>
            <div
              v-if="student && existingSubmission"
              class="assessment-state assessment-state--success"
            >
              <div class="assessment-state__title">
                تم الإرسال
              </div>
            </div>
            <div
              v-if="student && isEnabled && !existingSubmission && questions.length === 0"
              class="assessment-empty-state"
            >
              لا توجد أسئلة مضافة لهذا الفرع بعد.
            </div>

            <FinalExamAttemptPanel
              v-if="canInteract && questions.length"
              :questions="questions"
              :answers="answers"
              :files="files"
              :reset-key="resetKey"
              :submitting="submitting"
              :enabled="isEnabled"
              @answer="setAnswer"
              @select-file="handleFileSelect"
              @preview="openAttachmentPreview"
              @submit="handleSubmit"
            />
            <FinalExamReviewPanel
              v-if="existingSubmission && questions.length"
              :questions="questions"
              :submission="existingSubmission"
            />
          </template>
        </v-card>
      </div>
    </v-container>
  </div>
</template>

<script src="../features/controllers/FinalExamView.js"></script>

<style scoped src="../styles/views/final-exam-view.css"></style>
