<template>
  <div :class="{ 'assessment-task-toolbar': isTasksPage, 'assessment-task-toolbar--document': isTasksPage && selectedCourse && isDocumentMode }">
    <AppFilterToolbar
      class="assessment-toolbar assessment-toolbar--embedded"
      :class="{ 'assessment-toolbar--courses': !isTasksPage }"
      :columns="isTasksPage ? (selectedCourse && isDocumentMode ? 3 : 2) : columns"
    >
      <AppFilterField
        for-id="assessment-toolbar-course"
        :label="isTasksPage ? 'المهام الأدائية' : 'الدورات'"
      >
        <AppSelect
          id="assessment-toolbar-course"
          :value="courseValue"
          :items="courseOptions"
          item-text="label"
          item-value="value"
          :placeholder="coursePlaceholder"
          :title="selectedCourse?.title || coursePlaceholder"
          :disabled="changingContext"
          persistent-placeholder
          dense
          outlined
          hide-details
          class="assessment-select"
          :menu-props="{
            contentClass: 'assessment-course-menu',
            maxHeight: 360,
          }"
          @input="$emit('update:course-value', $event)"
        >
          <template
            v-if="canEdit"
            #item-title="{ item }"
          >
            <v-icon
              v-if="!item.course"
              size="20"
              aria-hidden="true"
            >
              mdi-plus
            </v-icon>
            <span
              class="assessment-course-option-label"
              :title="item.label"
            >{{ item.label }}</span>
          </template>
          <template
            v-if="canEdit"
            #item-actions="{ item, actionAttrs }"
          >
            <AppIconButton
              v-if="item.course"
              v-bind="actionAttrs"
              variant="plain"
              :aria-label="`تعديل اسم ${isTasksPage ? 'المهمة' : 'الدورة'} ${item.course.title}`"
              @click.stop="$emit('edit-course', item.course)"
            >
              <v-icon
                color="inherit"
                aria-hidden="true"
              >
                mdi-pencil-outline
              </v-icon>
            </AppIconButton>
            <AppIconButton
              v-if="item.course"
              v-bind="actionAttrs"
              variant="plain-danger"
              :disabled="deletingCourseId === item.course.id"
              :aria-label="`حذف ${isTasksPage ? 'المهمة' : 'الدورة'} ${item.course.title}`"
              @click.stop="$emit('delete-course', item.course)"
            >
              <v-icon
                color="inherit"
                aria-hidden="true"
              >
                mdi-delete-outline
              </v-icon>
            </AppIconButton>
          </template>
        </AppSelect>
      </AppFilterField>

      <div
        v-if="!isTasksPage"
        class="assessment-toolbar__branch-slot"
      >
        <slot name="branch" />
      </div>
      <AppFilterField
        v-else
        for-id="assessment-task-video"
        label="الرابط"
      >
        <input
          id="assessment-task-video"
          aria-label="الرابط"
          :value="taskVideoUrl"
          type="url"
          inputmode="url"
          class="assessment-input"
          :disabled="!canEdit || !selectedCourse"
          placeholder="ألصق رابط المهمة"
          @input="$emit('update:task-video-url', $event.target.value)"
        >
      </AppFilterField>

      <AppFilterField
        v-if="!isTasksPage"
        for-id="assessment-toolbar-mode"
        label="النوع"
      >
        <AppSelect
          id="assessment-toolbar-mode"
          :value="viewMode"
          :items="modeOptions"
          :disabled="changingContext"
          item-text="label"
          item-value="value"
          dense
          outlined
          hide-details
          class="assessment-select"
          @input="$emit('update:view-mode', $event)"
        />
      </AppFilterField>
      <AppFilterField
        v-if="isTasksPage && selectedCourse && isDocumentMode"
        for-id="assessment-task-points"
        label="درجة المهمة"
      >
        <input
          id="assessment-task-points"
          aria-label="درجة المهمة"
          :value="taskPoints"
          type="number"
          min="0"
          inputmode="numeric"
          class="assessment-input assessment-input--points"
          :disabled="!canEdit"
          placeholder="1"
          @input="$emit('update:task-points', $event.target.value)"
        >
      </AppFilterField>
    </AppFilterToolbar>

    <div
      v-if="isTasksPage && selectedCourse"
      class="assessment-toolbar__aux-fields"
    >
      <AppFilterField
        v-if="showDescription"
        class="assessment-toolbar__field assessment-form-card__field-group assessment-form-card__field-group--compact"
        for-id="assessment-task-description"
        label="الوصف"
      >
        <AppInput
          id="assessment-task-description"
          aria-label="الوصف"
          :value="taskDescription"
          multiline
          auto-resize
          :rows="4"
          class="assessment-toolbar__description"
          :disabled="!canEdit"
          placeholder="اكتب الوصف الذي سيظهر في المهمة"
          @input="$emit('update:task-description', $event)"
        />
      </AppFilterField>
    </div>

    <div
      v-if="isTasksPage && !selectedCourse"
      class="assessment-empty-state"
    >
      اختر المهمة أولًا.
    </div>
  </div>
</template>

<script>
import { AppIconButton, AppInput, AppFilterField, AppFilterToolbar, AppSelect } from '../ui';

export default {
  name: 'AssessmentCourseToolbar',
  components: { AppIconButton, AppInput, AppFilterField, AppFilterToolbar, AppSelect },
  props: {
    columns: { type: Number, default: 3 },
    isTasksPage: { type: Boolean, default: false },
    courseValue: { type: String, default: '' },
    courseOptions: { type: Array, required: true },
    coursePlaceholder: { type: String, default: '' },
    canEdit: { type: Boolean, default: false },
    changingContext: { type: Boolean, default: false },
    deletingCourseId: { type: String, default: '' },
    viewMode: { type: String, default: '' },
    modeOptions: { type: Array, required: true },
    selectedCourse: { type: Object, default: null },
    isDocumentMode: { type: Boolean, default: false },
    taskPoints: { type: String, default: '1' },
    taskVideoUrl: { type: String, default: '' },
    taskDescription: { type: String, default: '' },
    showDescription: { type: Boolean, default: false },
  },
  emits: [
    'update:course-value',
    'edit-course',
    'delete-course',
    'update:view-mode',
    'update:task-points',
    'update:task-video-url',
    'update:task-description',
  ],
};
</script>

<style scoped>
.assessment-course-option-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.assessment-toolbar__branch-slot { display: grid; min-width: 0; align-items: end; }
@media (max-width: 767px) {
  .assessment-toolbar--courses { --app-filter-columns: repeat(2, minmax(0, 1fr)); }
  .assessment-toolbar--courses :deep(.app-filter-field:first-child) { grid-column: 1 / -1; }
}
</style>
