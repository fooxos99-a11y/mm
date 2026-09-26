<template>
  <section class="assessment-layout">
    <article class="assessment-card">
      <AssessmentCourseToolbar
        v-bind="toolbarProps"
        show-description
        @update:course-value="$emit('update:course-value', $event)"
        @update:view-mode="$emit('update:view-mode', $event)"
        @update:task-points="$emit('update:task-points', $event)"
        @update:task-video-url="$emit('update:task-video-url', $event)"
        @update:task-description="$emit('update:task-description', $event)"
        @create-course="$emit('create-course')"
        @edit-course="$emit('edit-course', $event)"
        @move-course="$emit('move-course', $event)"
        @delete-course="$emit('delete-course', $event)"
      />
      <div class="assessment-template-shell__field">
        <div class="assessment-template-shell">
          <RichTextEditor
            :value="templateDraft"
            :disabled="!canEdit"
            min-height="260px"
            @input="$emit('update:template-draft', $event)"
          />
        </div>
      </div>
      <div
        v-if="canEdit"
        class="assessment-template-actions"
      >
        <AppButton
          variant="primary"
          :loading="templateSaving"
          :disabled="templateSaving"
          @click="$emit('save-template')"
        >
          {{ templateSaving ? 'جارٍ الحفظ...' : 'حفظ' }}
        </AppButton>
      </div>
    </article>
  </section>
</template>

<script>
import { defineAsyncComponent } from 'vue';
import { AppButton } from '../ui';
import AssessmentCourseToolbar from './AssessmentCourseToolbar.vue';

const RichTextEditor = defineAsyncComponent(() => import(
  /* webpackChunkName: "rich-text-editor" */ '../RichTextEditor.vue'
));

export default {
  name: 'AssessmentDocumentWorkspace',
  components: { AppButton, AssessmentCourseToolbar, RichTextEditor },
  props: {
    toolbarProps: { type: Object, required: true },
    templateDraft: { type: String, default: '' },
    templateSaving: { type: Boolean, default: false },
    canEdit: { type: Boolean, default: false },
  },
  emits: [
    'update:course-value',
    'update:view-mode',
    'update:task-points',
    'update:task-video-url',
    'update:task-description',
    'create-course',
    'edit-course',
    'move-course',
    'delete-course',
    'update:template-draft',
    'save-template',
  ],
};
</script>
