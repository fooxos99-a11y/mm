<template>
  <div>
    <div class="assessment-toolbar assessment-toolbar--embedded">
      <div class="assessment-toolbar__field">
        <label class="assessment-toolbar__label">{{ isTasksPage ? 'المهام الأدائية' : 'الدورات' }}</label>
        <AppSelect
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
      </div>

      <div
        v-if="!isTasksPage"
        class="assessment-toolbar__field"
      >
        <label class="assessment-toolbar__label">النوع</label>
        <AppSelect
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
      </div>
    </div>

    <div
      v-if="isTasksPage && selectedCourse"
      class="assessment-toolbar__aux-fields"
    >
      <div
        v-if="isDocumentMode"
        class="assessment-toolbar__field assessment-form-card__field-group assessment-form-card__field-group--compact"
      >
        <label
          class="assessment-form-card__label"
          for="assessment-task-points"
        >درجة المهمة</label>
        <input
          id="assessment-task-points"
          :value="taskPoints"
          type="number"
          min="0"
          inputmode="numeric"
          class="assessment-input assessment-input--points"
          :disabled="!canEdit"
          placeholder="1"
          @input="$emit('update:task-points', $event.target.value)"
        >
      </div>
      <div class="assessment-toolbar__field assessment-form-card__field-group assessment-form-card__field-group--compact">
        <label
          class="assessment-form-card__label"
          for="assessment-task-video"
        >الرابط</label>
        <input
          id="assessment-task-video"
          :value="taskVideoUrl"
          type="url"
          inputmode="url"
          class="assessment-input"
          :disabled="!canEdit"
          placeholder="ألصق رابط يوتيوب أو رابط فيديو مباشر"
          @input="$emit('update:task-video-url', $event.target.value)"
        >
      </div>
    </div>

    <div
      v-if="showDescription && isTasksPage && selectedCourse"
      class="assessment-toolbar__field assessment-toolbar__field--full assessment-form-card__field-group assessment-form-card__field-group--compact"
    >
      <label
        class="assessment-form-card__label"
        for="assessment-task-description"
      >الوصف</label>
      <textarea
        id="assessment-task-description"
        :value="taskDescription"
        class="assessment-input assessment-input--multiline"
        :disabled="!canEdit"
        placeholder="اكتب الوصف الذي سيظهر في المهمة"
        @input="$emit('update:task-description', $event.target.value)"
      />
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
import { AppRawButton, AppSelect } from '../ui';

export default {
  name: 'AssessmentCourseToolbar',
  components: { AppRawButton, AppSelect },
  props: {
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
};
</script>
