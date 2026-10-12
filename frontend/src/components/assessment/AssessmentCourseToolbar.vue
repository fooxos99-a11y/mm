<template>
  <div :class="{ 'assessment-task-toolbar': isTasksPage }">
    <AppFilterToolbar
      class="assessment-toolbar assessment-toolbar--embedded"
      :columns="isTasksPage ? (selectedCourse && isDocumentMode ? 2 : 1) : columns"
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
            #item="{ item, on, attrs }"
          >
            <v-list-item
              class="assessment-select-option"
              :class="{ 'assessment-select-option--create': !item.course }"
              v-bind="attrs"
              v-on="on"
            >
              <template #title>
                <span class="assessment-select-option__label">
                  <v-icon
                    v-if="!item.course"
                    size="20"
                    aria-hidden="true"
                  >
                    mdi-plus
                  </v-icon>
                  {{ item.label }}
                </span>
              </template>
              <template #append>
                <div
                  v-if="item.course"
                  class="assessment-select-option__actions"
                >
                  <AppRawButton
                    type="button"
                    class="assessment-select-option__action"
                    :aria-label="`تعديل اسم ${item.course.entityType === 'task' ? 'المهمة' : 'الدورة'} ${item.label}`"
                    @mousedown.stop.prevent
                    @click.stop.prevent="$emit('edit-course', item.course)"
                  >
                    <v-icon aria-hidden="true">
                      mdi-pencil-outline
                    </v-icon>
                  </AppRawButton>
                  <AppRawButton
                    type="button"
                    class="assessment-select-option__action assessment-select-option__delete"
                    :disabled="deletingCourseId === item.value"
                    :aria-label="`حذف ${item.course.entityType === 'task' ? 'المهمة' : 'الدورة'} ${item.label}`"
                    @mousedown.stop.prevent
                    @click.stop.prevent="$emit('delete-course', item.course)"
                  >
                    <v-icon aria-hidden="true">
                      mdi-delete-outline
                    </v-icon>
                  </AppRawButton>
                </div>
              </template>
            </v-list-item>
          </template>
        </AppSelect>
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

      <AppFilterField
        v-if="!isTasksPage"
        for-id="assessment-toolbar-mode"
        label="النوع"
      >
        <AppSelect
          id="assessment-toolbar-mode"
          :value="viewMode"
          :items="modeOptions"
          item-text="label"
          item-value="value"
          dense
          outlined
          hide-details
          class="assessment-select"
          @input="$emit('update:view-mode', $event)"
        />
      </AppFilterField>
      <slot name="branch" />
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
        <textarea
          id="assessment-task-description"
          aria-label="الوصف"
          :value="taskDescription"
          rows="1"
          wrap="off"
          class="assessment-input assessment-input--multiline"
          :disabled="!canEdit"
          placeholder="اكتب الوصف الذي سيظهر في المهمة"
          @input="$emit('update:task-description', $event.target.value)"
        />
      </AppFilterField>
      <AppFilterField
        class="assessment-toolbar__field assessment-form-card__field-group assessment-form-card__field-group--compact"
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
          :disabled="!canEdit"
          placeholder="ألصق رابط يوتيوب أو رابط فيديو مباشر"
          @input="$emit('update:task-video-url', $event.target.value)"
        >
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
import { AppFilterField, AppFilterToolbar, AppRawButton, AppSelect } from '../ui';

export default {
  name: 'AssessmentCourseToolbar',
  components: { AppFilterField, AppFilterToolbar, AppRawButton, AppSelect },
  props: {
    columns: { type: Number, default: 2 },
    isTasksPage: { type: Boolean, default: false },
    courseValue: { type: String, default: '' },
    courseOptions: { type: Array, required: true },
    coursePlaceholder: { type: String, default: '' },
    canEdit: { type: Boolean, default: false },
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
