<template>
  <div
    class="admin-training-materials"
    :class="{ 'admin-training-materials--embedded': embedded }"
  >
    <section class="admin-training-materials__controls">
      <div class="admin-training-materials__toolbar">
        <div class="prep-field admin-training-materials__filter-field">
          <label class="prep-field__label">المادة التدريبية</label>
          <AppSelect
            :key="materialSelectResetKey"
            v-model="materialSelectValue"
            aria-label="المادة التدريبية"
            :items="materialOptions"
            item-text="label"
            item-value="value"
            placeholder="اختر المادة"
            persistent-placeholder
            hide-details
            dense
            outlined
            class="prep-select admin-training-materials__select"
          />
        </div>
      </div>

      <div
        v-if="!hasMaterials"
        class="admin-training-materials__empty"
      >
        لا توجد مواد تدريبية بعد. اختر إضافة مادة من القائمة لإنشاء أول مادة.
      </div>
    </section>

    <TrainingMaterialsList
      v-if="hasMaterials"
      :materials="displayedMaterials"
      preview-in-dialog
      show-edit
      show-delete
      :deleting-id="deletingId"
      empty-title="لا توجد بيانات لعرضها."
      empty-description=""
      @edit="openEditDialog"
      @delete="removeMaterial"
    />

    <AppDialog
      v-model="dialogOpen"
      max-width="760"
      @close="closeDialog"
    >
      <div class="admin-training-materials__dialog">
        <AppDialogHeader :title="dialogTitle" />

        <AppDialogBody class="admin-training-materials__dialog-body">
          <div
            v-if="formError"
            class="admin-training-materials__form-error"
            role="alert"
          >
            {{ formError }}
          </div>

          <label class="admin-training-materials__field">
            <span class="admin-training-materials__label">العنوان</span>
            <input
              v-model.trim="form.title"
              type="text"
              class="admin-training-materials__input"
            >
          </label>

          <label class="admin-training-materials__field">
            <span class="admin-training-materials__label">الفرع</span>
            <AppSelect
              v-model="form.branchId"
              aria-label="الفرع"
              :items="branchOptions"
              item-text="label"
              item-value="id"
              dense
              outlined
              hide-details
              class="admin-training-materials__select"
            />
          </label>

          <label class="admin-training-materials__field">
            <span class="admin-training-materials__label">الوصف</span>
            <textarea
              v-model.trim="form.description"
              class="admin-training-materials__textarea"
              rows="4"
            />
          </label>

          <div class="admin-training-materials__field">
            <div class="admin-training-materials__attachments-header">
              <span class="admin-training-materials__label">المرفقات</span>
              <AppRawButton
                type="button"
                class="admin-training-materials__add-attachment"
                aria-label="إضافة مرفق"
                @click="addAttachmentRow"
              >
                <v-icon size="19">
                  mdi-paperclip
                </v-icon>
                <span>إضافة مرفق</span>
              </AppRawButton>
            </div>

            <div class="admin-training-materials__attachments">
              <div
                v-for="(attachment, index) in form.attachments"
                :key="attachment.id"
                class="admin-training-materials__attachment-block"
              >
                <div class="admin-training-materials__attachment-row">
                  <input
                    v-model.trim="attachment.label"
                    type="text"
                    class="admin-training-materials__input admin-training-materials__attachment-name-input"
                    placeholder="اسم الملف أو رابط المقطع"
                  >

                  <div class="admin-training-materials__attachment-actions">
                    <label
                      class="admin-training-materials__attachment-picker"
                      title="اختيار ملف"
                    >
                      <input
                        type="file"
                        accept=".pdf,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt,.mp4,.webm,.mov,.mp3,.wav,application/pdf,application/zip,application/x-zip-compressed,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/jpeg,image/png,image/gif,image/webp,text/plain,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav"
                        class="admin-training-materials__hidden-file-input"
                        @change="handleAttachmentFileChange(index, $event)"
                      >
                      <v-icon size="21">
                        mdi-file-upload-outline
                      </v-icon>
                    </label>

                    <AppRawButton
                      type="button"
                      class="admin-training-materials__remove-attachment"
                      aria-label="حذف المرفق"
                      @click="removeAttachmentRow(index)"
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
                  v-if="attachment.file"
                  class="admin-training-materials__files-note"
                >
                  {{ attachment.file.name }}
                </div>
                <div
                  v-else-if="attachment.existingFileName"
                  class="admin-training-materials__files-note"
                >
                  {{ attachment.existingFileName }}
                </div>
              </div>
            </div>
          </div>
        </AppDialogBody>

        <AppDialogFooter class="admin-training-materials__dialog-footer">
          <AppButton
            variant="secondary"
            @click="closeDialog"
          >
            إلغاء
          </AppButton>
          <AppButton
            variant="primary"
            :loading="submitting"
            @click="submitMaterial"
          >
            {{ submitButtonLabel }}
          </AppButton>
        </AppDialogFooter>
      </div>
    </AppDialog>
  </div>
</template>

<script src="../features/controllers/AdminTrainingMaterialsView.js"></script>

<style scoped src="../styles/views/admin-training-materials.css"></style>
