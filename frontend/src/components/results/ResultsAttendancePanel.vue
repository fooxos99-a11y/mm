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
        <AttendanceSessionControl
          v-if="selectedCourse && selectedCourse.entityType !== 'task'"
          :key="courseId"
          :course="selectedCourse"
          :branch="managedBranchId || branchId"
          :can-edit="true"
          :saving="isSaving"
          @action-state="sessionActionDisabled = $event.disabled"
          @select="$emit('select-session', $event)"
        />
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
            :disabled="isSaving"
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
            id="results-attendance-course-label"
            class="prep-field__label"
            for="results-attendance-course"
          >الدورة / المهام</label>
          <AppSelect
            id="results-attendance-course"
            :value="courseId"
            :disabled="isSaving"
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
              #item-actions="{ item, actionAttrs }"
            >
              <AppIconButton
                v-bind="actionAttrs"
                variant="plain-danger"
                :disabled="deletingCourseId === item.value"
                :aria-label="`حذف ${item.course?.entityType === 'task' ? 'المهمة' : 'الدورة'} ${item.label}`"
                @click.stop.prevent="$emit('request-course-delete', item.course)"
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
        </div>

        <AppRawButton
          type="button"
          class="attendance-toggle prep-filters__toggle"
          :class="{
            'attendance-toggle--active': allVisibleChecked,
            'attendance-toggle--partial': visibleCheckedCount > 0 && !allVisibleChecked,
          }"
          :disabled="!students.length || isSaving || selectedSession?.loading || sessionActionDisabled"
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
                  :disabled="isSaving || selectedSession?.loading || sessionActionDisabled"
                  @click="$emit('toggle-student', student.id)"
                >
                  <span class="attendance-toggle__dot" />
                </AppRawButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <AttendanceHistory
        :records="attendanceRecords"
        :students="students"
        :course-id="courseId"
        :session-id="selectedSession?.id || ''"
      />
    </section>
  </div>
</template>

<script>
import AttendanceSessionControl from '../assessment/AttendanceSessionControl.vue';
import AttendanceHistory from '../assessment/AttendanceHistory.vue';
import { AppButton, AppIconButton, AppRawButton, AppSelect } from '../ui';

export default {
  name: 'ResultsAttendancePanel',
  components: { AttendanceHistory, AttendanceSessionControl, AppButton, AppIconButton, AppRawButton, AppSelect },
  props: {
    selectedSession: { type: Object, default: null },
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
    attendanceRecords: { type: Array, default: () => [] },
    displayedStudents: { type: Array, default: () => [] },
    checkedStudentIds: { type: Array, default: () => [] },
  },
  emits: [
    'select-session',
    'request-course-delete',
    'toggle-student',
    'toggle-visible',
    'update:branch-id',
    'update:course-id',
  ],
  data: () => ({ sessionActionDisabled: true }),
  computed: { selectedCourse() { return this.courseOptions.find(course => course.value === this.courseId)?.course; } },
};
</script>
