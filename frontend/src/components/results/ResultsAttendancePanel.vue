<template>
  <div class="prep-layout">
    <section class="prep-card">
      <div class="prep-card__head">
        <div>
          <h1 class="prep-card__title">
            التحضير
          </h1>
          <div
            v-if="saveStatusText"
            class="prep-card__status"
            :class="{ 'prep-card__status--saving': isSaving }"
          >
            {{ saveStatusText }}
          </div>
        </div>
        <AppButton
          v-if="!embedded"
          variant="plain"
          :to="{ name: 'dashboard' }"
        >
          رجوع للوحة
        </AppButton>
      </div>

      <div class="prep-filters">
        <div
          v-if="!managedBranchId"
          class="prep-field"
        >
          <label
            class="prep-field__label"
            for="results-attendance-branch"
          >الفرع</label>
          <AppSelect
            id="results-attendance-branch"
            :value="branchId"
            aria-label="الفرع"
            :items="branchOptions"
            item-text="label"
            item-value="value"
            dense
            outlined
            hide-details
            class="prep-select"
            @input="$emit('update:branch-id', $event)"
          />
        </div>

        <div class="prep-field prep-field--wide">
          <label
            class="prep-field__label"
            for="results-attendance-course"
          >الدورة / المهام</label>
          <AppSelect
            id="results-attendance-course"
            :value="courseId"
            aria-label="الدورة أو المهمة"
            :items="courseOptions"
            item-text="label"
            item-value="value"
            dense
            outlined
            hide-details
            class="prep-select"
            @input="$emit('update:course-id', $event)"
          >
            <template
              v-if="canManageCourses"
              #item="{ item, on, attrs }"
            >
              <div
                class="results-course-option"
                v-bind="attrs"
                v-on="on"
              >
                <span class="results-course-option__label">{{ item.label }}</span>
                <AppRawButton
                  type="button"
                  class="results-course-option__delete"
                  :disabled="deletingCourseId === item.value"
                  :aria-label="`حذف ${item.course?.entityType === 'task' ? 'المهمة' : 'الدورة'} ${item.label}`"
                  @mousedown.stop.prevent
                  @click.stop.prevent="$emit('request-course-delete', item.course)"
                >
                  <v-icon aria-hidden="true">
                    mdi-delete-outline
                  </v-icon>
                </AppRawButton>
              </div>
            </template>
          </AppSelect>
        </div>

        <AppRawButton
          type="button"
          class="attendance-toggle prep-filters__toggle"
          :class="{
            'attendance-toggle--active': allVisibleChecked,
            'attendance-toggle--partial': visibleCheckedCount > 0 && !allVisibleChecked,
          }"
          :disabled="!students.length || isSaving"
          @click="$emit('toggle-visible')"
        >
          <span class="attendance-toggle__dot" />
        </AppRawButton>
      </div>

      <div class="prep-table-wrap">
        <table class="prep-table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>رقم الدخول</th>
              <th>حاضر</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!displayedStudents.length">
              <td
                colspan="3"
                class="prep-table__empty"
              >
                لا يوجد معلمون في هذا الفرع.
              </td>
            </tr>
            <tr
              v-for="student in displayedStudents"
              :key="student.id"
            >
              <td class="prep-table__name">
                {{ student.name }}
              </td>
              <td class="prep-table__login">
                {{ student.loginId || '---' }}
              </td>
              <td class="prep-table__status">
                <AppRawButton
                  type="button"
                  class="attendance-toggle"
                  :class="{ 'attendance-toggle--active': checkedStudentIds.includes(student.id) }"
                  :disabled="isSaving"
                  @click="$emit('toggle-student', student.id)"
                >
                  <span class="attendance-toggle__dot" />
                </AppRawButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script>
import { AppButton, AppRawButton, AppSelect } from '../ui';

export default {
  name: 'ResultsAttendancePanel',
  components: { AppButton, AppRawButton, AppSelect },
  props: {
    embedded: { type: Boolean, default: false },
    saveStatusText: { type: String, default: '' },
    isSaving: { type: Boolean, default: false },
    managedBranchId: { type: String, default: '' },
    branchId: { type: String, default: '' },
    branchOptions: { type: Array, default: () => [] },
    courseId: { type: String, default: '' },
    courseOptions: { type: Array, default: () => [] },
    canManageCourses: { type: Boolean, default: false },
    deletingCourseId: { type: String, default: '' },
    allVisibleChecked: { type: Boolean, default: false },
    visibleCheckedCount: { type: Number, default: 0 },
    students: { type: Array, default: () => [] },
    displayedStudents: { type: Array, default: () => [] },
    checkedStudentIds: { type: Array, default: () => [] },
  },
  emits: [
    'request-course-delete',
    'toggle-student',
    'toggle-visible',
    'update:branch-id',
    'update:course-id',
  ],
};
</script>
