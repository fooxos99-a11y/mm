<template>
  <div class="training-materials-list">
    <v-dialog
      v-model="previewDialogOpen"
      max-width="1120"
      :aria-label="previewAttachmentName"
    >
      <v-card
        class="training-materials-list__preview-dialog"
      >
        <div class="training-materials-list__preview-header">
          <div class="training-materials-list__preview-title">
            {{ previewAttachmentName }}
          </div>
        </div>

        <div
          class="training-materials-list__preview-body"
        >
          <div
            v-if="previewLoading"
            class="training-materials-list__preview-status"
            role="status"
          >
            <v-progress-circular
              indeterminate
              color="primary"
              size="32"
            />
            <span>جارٍ تحميل الملف…</span>
          </div>
          <div
            v-else-if="previewError"
            class="training-materials-list__preview-status training-materials-list__preview-status--error"
            role="alert"
          >
            <v-icon size="28">
              mdi-alert-circle-outline
            </v-icon>
            <span>{{ previewError }}</span>
          </div>
          <TrainingPdfViewer
            v-else-if="previewIsPdf && previewDialogOpen"
            :key="previewAttachment.id || previewAttachment.url"
            :source="previewAttachment.previewUrl || previewAttachment.url"
          />
          <img
            v-else-if="previewKind === 'image' && previewSource"
            :src="previewSource"
            :alt="previewAttachmentName"
            class="training-materials-list__preview-image"
          >
          <video
            v-else-if="previewKind === 'video' && previewSource"
            :src="previewSource"
            controls
            preload="metadata"
            class="training-materials-list__preview-video"
          />
          <audio
            v-else-if="previewKind === 'audio' && previewSource"
            :src="previewSource"
            controls
            preload="metadata"
            class="training-materials-list__preview-audio"
          />
          <iframe
            v-else-if="(previewKind === 'document' || previewKind === 'youtube') && previewSource"
            :src="previewSource"
            class="training-materials-list__preview-frame"
            :title="previewAttachmentName"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          />
          <div
            v-else
            class="training-materials-list__preview-empty"
          >
            <v-icon size="32">
              mdi-file-download-outline
            </v-icon>
            <strong>{{ previewFileName }}</strong>
            <span>لا يعرض المتصفح هذا النوع مباشرة، ويمكنك تنزيله.</span>
          </div>
        </div>

        <AppActionBar class="training-materials-list__preview-actions">
          <AppButton
            v-if="previewAttachment?.type === 'file' && (previewSource || previewIsPdf) && !previewLoading && !previewError"
            variant="primary"
            :href="previewDownloadUrl"
            :download="previewFileName"
            class="training-materials-list__preview-download"
          >
            <v-icon size="19">
              mdi-download-outline
            </v-icon>
            تنزيل الملف
          </AppButton>
          <AppButton
            variant="secondary"
            class="training-materials-list__preview-close"
            @click="closePreviewDialog"
          >
            إغلاق
          </AppButton>
        </AppActionBar>
      </v-card>
    </v-dialog>

    <div
      v-if="!materials.length"
      class="training-materials-list__empty"
    >
      <div class="training-materials-list__empty-title">
        {{ emptyTitle }}
      </div>
      <div class="training-materials-list__empty-copy">
        {{ emptyDescription }}
      </div>
    </div>

    <div
      v-else
      class="training-materials-list__grid"
    >
      <article
        v-for="material in materials"
        :key="material.id"
        class="training-materials-list__card"
      >
        <div class="training-materials-list__head">
          <div class="training-materials-list__title-group">
            <span
              class="training-materials-list__icon"
              aria-hidden="true"
            >
              <v-icon size="22">
                mdi-file-document-multiple-outline
              </v-icon>
            </span>
            <div>
              <div class="training-materials-list__title">
                {{ material.title }}
              </div>
            </div>
          </div>

          <div
            v-if="(showEdit || showDelete) && material.canManage !== false"
            class="training-materials-list__actions"
          >
            <AppRawButton
              v-if="showEdit && material.canManage !== false"
              type="button"
              class="training-materials-list__action-button training-materials-list__action-button--edit"
              aria-label="تعديل المادة"
              @click="$emit('edit', material)"
            >
              <v-icon small>
                mdi-pencil-outline
              </v-icon>
            </AppRawButton>
            <AppRawButton
              v-if="showDelete && material.canManage !== false"
              type="button"
              class="training-materials-list__action-button training-materials-list__action-button--delete"
              aria-label="حذف المادة"
              :disabled="deletingId === material.id"
              @click="$emit('delete', material.id)"
            >
              <v-icon
                class="app-action-icon app-action-icon--delete"
                aria-hidden="true"
              >
                mdi-delete-outline
              </v-icon>
            </AppRawButton>
          </div>
        </div>

        <div
          v-if="material.description"
          class="training-materials-list__description"
        >
          {{ material.description }}
        </div>

        <div class="training-materials-list__attachments">
          <component
            :is="previewInDialog ? 'button' : 'a'"
            v-for="attachment in material.attachments"
            :key="attachment.id"
            :href="previewInDialog ? undefined : attachment.url"
            :target="previewInDialog ? undefined : '_blank'"
            :rel="previewInDialog ? undefined : 'noopener'"
            type="button"
            class="training-materials-list__attachment"
            @click="previewInDialog ? openPreviewDialog(attachment) : null"
          >
            <span
              class="training-materials-list__attachment-icon"
              aria-hidden="true"
            >
              <v-icon size="18">
                {{ attachment.type === 'youtube' ? 'mdi-youtube' : 'mdi-paperclip' }}
              </v-icon>
            </span>
            <span class="training-materials-list__attachment-name">{{ attachment.displayName || attachment.originalName || attachment.name }}</span>
          </component>
        </div>
      </article>
    </div>
  </div>
</template>

<script src="../features/controllers/TrainingMaterialsList.js"></script>

<style scoped src="../styles/views/training-materials-list.css"></style>
