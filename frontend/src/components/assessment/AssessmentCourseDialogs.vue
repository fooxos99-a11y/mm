<template>
  <div class="assessment-dialogs-host">
    <AppDialog
      :value="createOpen"
      max-width="620"
      @input="$emit('update:create-open', $event)"
    >
      <div class="assessment-dialog assessment-dialog--compact">
        <AppDialogHeader :title="isTasksPage ? 'إضافة مهمة أدائية' : 'إضافة دورة جديدة'" />
        <AppDialogBody
          class="assessment-dialog__body assessment-dialog__body--compact"
          compact
        >
          <label
            class="assessment-form-card__label"
            for="assessment-course-create-title"
          >{{ isTasksPage ? 'اسم المهمة الأدائية' : 'اسم الدورة' }}</label>
          <input
            id="assessment-course-create-title"
            :value="createTitle"
            type="text"
            class="assessment-input"
            :placeholder="isTasksPage ? 'اسم المهمة الأدائية' : 'اسم الدورة'"
            @input="$emit('update:create-title', $event.target.value)"
          >

          <template v-if="isTasksPage">
            <div class="assessment-form-card__field-group assessment-dialog__spaced-input">
              <label
                class="assessment-form-card__label"
                for="assessment-course-create-video"
              >رابط الفيديو (اختياري)</label>
              <input
                id="assessment-course-create-video"
                :value="createVideoUrl"
                type="url"
                inputmode="url"
                class="assessment-input"
                placeholder="https://..."
                @input="$emit('update:create-video-url', $event.target.value)"
              >
            </div>
            <div class="assessment-form-card__field-group assessment-dialog__spaced-input">
              <label
                class="assessment-form-card__label"
                for="assessment-course-create-description"
              >وصف المهمة (اختياري)</label>
              <textarea
                id="assessment-course-create-description"
                :value="createDescription"
                class="assessment-input assessment-input--multiline"
                placeholder="اكتب وصف المهمة"
                @input="$emit('update:create-description', $event.target.value)"
              />
            </div>
          </template>

          <p
            v-if="isTasksPage && createMode === 'document'"
            class="assessment-dialog__text assessment-dialog__text--muted"
          >
            سيتم إنشاء مهمة وورد واعتماد الدرجة المحددة في الحقل العلوي للمرفق.
          </p>

          <div
            v-if="isTasksPage && createMode === 'document'"
            class="assessment-form-card__field-group assessment-dialog__spaced-input"
          >
            <span class="assessment-form-card__label">الوصف</span>
            <div class="assessment-template-shell">
              <RichTextEditor
                :value="templateDraft"
                min-height="220px"
                @input="$emit('update:template-draft', $event)"
              />
            </div>
          </div>

          <p
            v-else-if="isTasksPage && createQuestionType"
            class="assessment-dialog__text assessment-dialog__text--muted"
          >
            بعد إنشاء المهمة سيتم فتح محرر
            {{ createQuestionType === 'multiple' ? 'الخيارات' : (createQuestionType === 'truefalse' ? 'صح أو خطأ' : 'السؤال النصي') }}
            مباشرة داخل نفس الصفحة.
          </p>
        </AppDialogBody>
        <AppDialogFooter class="assessment-dialog__footer">
          <AppButton
            variant="secondary"
            @click="$emit('cancel-create')"
          >
            إلغاء
          </AppButton>
          <AppButton
            variant="primary"
            :loading="createSubmitting"
            @click="$emit('submit-create')"
          >
            {{ createSubmitting ? 'جارٍ الإضافة...' : 'إضافة' }}
          </AppButton>
        </AppDialogFooter>
      </div>
    </AppDialog>

    <AppDialog
      :value="editOpen"
      max-width="620"
      @input="$emit('update:edit-open', $event)"
    >
      <div class="assessment-dialog assessment-dialog--compact">
        <AppDialogHeader :title="isTasksPage ? 'تعديل اسم المهمة' : 'تعديل اسم الدورة'" />
        <AppDialogBody
          class="assessment-dialog__body assessment-dialog__body--compact"
          compact
        >
          <label
            class="assessment-form-card__label"
            for="assessment-course-edit-title"
          >{{ isTasksPage ? 'اسم المهمة الأدائية' : 'اسم الدورة' }}</label>
          <input
            id="assessment-course-edit-title"
            :value="editTitle"
            type="text"
            class="assessment-input"
            :placeholder="isTasksPage ? 'اسم المهمة الأدائية' : 'اسم الدورة'"
            @input="$emit('update:edit-title', $event.target.value)"
          >
        </AppDialogBody>
        <AppDialogFooter class="assessment-dialog__footer">
          <AppButton
            variant="secondary"
            @click="$emit('cancel-edit')"
          >
            إلغاء
          </AppButton>
          <AppButton
            variant="primary"
            :loading="editSubmitting"
            @click="$emit('submit-edit')"
          >
            {{ editSubmitting ? 'جارٍ الحفظ...' : 'حفظ' }}
          </AppButton>
        </AppDialogFooter>
      </div>
    </AppDialog>

    <AppDialog
      :value="deleteOpen"
      max-width="620"
      @input="$emit('update:delete-open', $event)"
    >
      <div class="assessment-dialog assessment-dialog--compact">
        <AppDialogHeader :title="isTasksPage ? 'تأكيد حذف المهمة' : 'تأكيد حذف الدورة'" />
        <AppDialogBody
          class="assessment-dialog__body assessment-dialog__body--compact"
          compact
        >
          <p class="assessment-dialog__text">
            هل أنت متأكد من حذف {{ isTasksPage ? 'المهمة' : 'الدورة' }}
            <strong>{{ deleteTitle || 'المحددة' }}</strong>؟
          </p>
        </AppDialogBody>
        <AppDialogFooter class="assessment-dialog__footer">
          <AppButton
            variant="secondary"
            @click="$emit('cancel-delete')"
          >
            إلغاء
          </AppButton>
          <AppButton
            variant="danger"
            :loading="deleteSubmitting"
            @click="$emit('confirm-delete')"
          >
            {{ deleteSubmitting ? 'جارٍ الحذف...' : 'حذف' }}
          </AppButton>
        </AppDialogFooter>
      </div>
    </AppDialog>
  </div>
</template>

<script>
import { defineAsyncComponent } from 'vue';
import {
  AppButton, AppDialog, AppDialogBody, AppDialogFooter, AppDialogHeader,
} from '../ui';

const RichTextEditor = defineAsyncComponent(() => import(
  /* webpackChunkName: "rich-text-editor" */ '../RichTextEditor.vue'
));

export default {
  name: 'AssessmentCourseDialogs',
  components: {
    AppButton, AppDialog, AppDialogBody, AppDialogFooter, AppDialogHeader, RichTextEditor,
  },
  props: {
    isTasksPage: { type: Boolean, default: false },
    createOpen: { type: Boolean, default: false },
    createTitle: { type: String, default: '' },
    createMode: { type: String, default: 'questions' },
    createQuestionType: { type: String, default: '' },
    templateDraft: { type: String, default: '' },
    createVideoUrl: { type: String, default: '' },
    createDescription: { type: String, default: '' },
    createSubmitting: { type: Boolean, default: false },
    editOpen: { type: Boolean, default: false },
    editTitle: { type: String, default: '' },
    editSubmitting: { type: Boolean, default: false },
    deleteOpen: { type: Boolean, default: false },
    deleteTitle: { type: String, default: '' },
    deleteSubmitting: { type: Boolean, default: false },
  },
  emits: [
    'update:create-open',
    'update:create-title',
    'update:create-video-url',
    'update:create-description',
    'update:template-draft',
    'cancel-create',
    'submit-create',
    'update:edit-open',
    'update:edit-title',
    'cancel-edit',
    'submit-edit',
    'update:delete-open',
    'cancel-delete',
    'confirm-delete',
  ],
};
</script>
