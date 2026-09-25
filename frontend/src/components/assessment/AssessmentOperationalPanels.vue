<template>
  <div class="assessment-operational-panels">
    <div
      v-if="mode === 'indicators'"
      class="prep-layout"
    >
      <section class="prep-card">
        <AssessmentCourseToolbar
          :course-value="courseValue"
          :course-options="courseOptions"
          :course-placeholder="coursePlaceholder"
          :view-mode="viewMode"
          :mode-options="modeOptions"
          :can-edit="canManageCatalog"
          :deleting-course-id="deletingCourseId"
          @update:course-value="$emit('update:course-value', $event)"
          @update:view-mode="$emit('update:view-mode', $event)"
          @create-course="$emit('create-course')"
          @edit-course="$emit('edit-course', $event)"
          @move-course="$emit('move-course', $event)"
          @delete-course="$emit('delete-course', $event)"
        />

        <div class="assessment-indicators-card__controls assessment-indicators-card__controls--embedded">
          <div
            v-if="!managedBranchId"
            class="assessment-indicators-card__filter-group"
          >
            <label class="assessment-indicators-card__label">الفرع</label>
            <AppSelect
              :value="indicatorBranch"
              :items="indicatorBranchOptions"
              item-text="label"
              item-value="value"
              dense
              outlined
              hide-details
              class="assessment-select"
              @input="$emit('update:indicator-branch', $event)"
            />
          </div>
        </div>

        <div
          v-if="selectedCourse && !totalStudents"
          class="assessment-empty-state"
        >
          لا يوجد معلمون مطابقون للفرع المحدد.
        </div>
        <div
          v-else-if="selectedCourse"
          class="assessment-indicators-panel"
        >
          <article class="assessment-score-indicator">
            <div
              class="assessment-score-indicator__ring"
              :style="preStyle"
            >
              <div class="assessment-score-indicator__ring-core">
                {{ preValue }}
              </div>
            </div>
            <div class="assessment-score-indicator__text">
              <div class="assessment-score-indicator__subtitle">
                الاختبار القبلي
              </div>
              <div class="assessment-score-indicator__sublabel">
                {{ preMeta }}
              </div>
            </div>
          </article>
          <div
            class="assessment-score-diff"
            :class="scoreDiffClass"
          >
            <div class="assessment-score-diff__value">
              {{ scoreDiffLabel }}
            </div>
          </div>
          <article class="assessment-score-indicator">
            <div
              class="assessment-score-indicator__ring"
              :style="postStyle"
            >
              <div class="assessment-score-indicator__ring-core">
                {{ postValue }}
              </div>
            </div>
            <div class="assessment-score-indicator__text">
              <div class="assessment-score-indicator__subtitle">
                الاختبار البعدي
              </div>
              <div class="assessment-score-indicator__sublabel">
                {{ postMeta }}
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>

    <div
      v-else-if="mode === 'attendance'"
      class="prep-layout"
    >
      <section class="prep-card">
        <AssessmentCourseToolbar
          :course-value="courseValue"
          :course-options="courseOptions"
          :course-placeholder="coursePlaceholder"
          :view-mode="viewMode"
          :mode-options="modeOptions"
          :can-edit="canManageCatalog"
          :deleting-course-id="deletingCourseId"
          @update:course-value="$emit('update:course-value', $event)"
          @update:view-mode="$emit('update:view-mode', $event)"
          @create-course="$emit('create-course')"
          @edit-course="$emit('edit-course', $event)"
          @move-course="$emit('move-course', $event)"
          @delete-course="$emit('delete-course', $event)"
        />
        <div
          v-if="selectedCourse && saveStatus"
          class="prep-card__status prep-card__status--inline"
          :class="{ 'prep-card__status--saving': savingAttendance }"
        >
          {{ saveStatus }}
        </div>
        <div
          v-if="selectedCourse"
          class="prep-filters prep-filters--single"
        >
          <div
            v-if="!managedBranchId"
            class="prep-field prep-field--wide"
          >
            <label class="prep-field__label">الفرع</label>
            <AppSelect
              :value="attendanceBranch"
              :items="attendanceBranchOptions"
              item-text="label"
              item-value="value"
              dense
              outlined
              hide-details
              class="prep-select"
              @input="$emit('update:attendance-branch', $event)"
            />
          </div>
          <AppRawButton
            type="button"
            class="attendance-toggle prep-filters__toggle"
            :class="{
              'attendance-toggle--active': allChecked,
              'attendance-toggle--partial': checkedCount > 0 && !allChecked,
            }"
            :disabled="!canEdit || !students.length || savingAttendance"
            :aria-label="allChecked ? 'إلغاء تحديد حضور الجميع' : 'تحديد حضور الجميع'"
            :aria-pressed="allChecked"
            @click="$emit('toggle-all')"
          >
            <span class="attendance-toggle__dot" />
          </AppRawButton>
        </div>
        <div
          v-if="selectedCourse"
          class="prep-table-wrap"
        >
          <table class="prep-table">
            <thead><tr><th>الاسم</th><th>رقم الدخول</th><th>حاضر</th></tr></thead>
            <tbody>
              <tr v-if="!students.length">
                <td
                  colspan="3"
                  class="prep-table__empty"
                >
                  لا يوجد معلمون في هذا الفرع.
                </td>
              </tr>
              <tr
                v-for="student in students"
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
                    :class="{ 'attendance-toggle--active': checkedIds.includes(student.id) }"
                    :disabled="!canEdit || savingAttendance"
                    :aria-label="`تبديل حضور ${student.name}`"
                    :aria-pressed="checkedIds.includes(student.id)"
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
  </div>
</template>

<script>
import { AppRawButton, AppSelect } from '../ui';
import AssessmentCourseToolbar from './AssessmentCourseToolbar.vue';

export default {
  name: 'AssessmentOperationalPanels',
  components: { AppRawButton, AppSelect, AssessmentCourseToolbar },
  props: {
    mode: { type: String, default: '' },
    courseValue: { type: String, default: '' },
    courseOptions: { type: Array, default: () => [] },
    coursePlaceholder: { type: String, default: '' },
    viewMode: { type: String, default: '' },
    modeOptions: { type: Array, default: () => [] },
    canEdit: Boolean,
    canManageCatalog: Boolean,
    deletingCourseId: { type: String, default: '' },
    managedBranchId: { type: String, default: '' },
    indicatorBranch: { type: String, default: '' },
    indicatorBranchOptions: { type: Array, default: () => [] },
    selectedCourse: { type: Object, default: null },
    totalStudents: { type: Number, default: 0 },
    preValue: { type: String, default: '' },
    preMeta: { type: String, default: '' },
    preStyle: { type: Object, default: () => ({}) },
    postValue: { type: String, default: '' },
    postMeta: { type: String, default: '' },
    postStyle: { type: Object, default: () => ({}) },
    scoreDiffLabel: { type: String, default: '' },
    scoreDiffClass: { type: String, default: '' },
    saveStatus: { type: String, default: '' },
    savingAttendance: Boolean,
    attendanceBranch: { type: String, default: '' },
    attendanceBranchOptions: { type: Array, default: () => [] },
    students: { type: Array, default: () => [] },
    checkedIds: { type: Array, default: () => [] },
    checkedCount: { type: Number, default: 0 },
    allChecked: Boolean,
  },
};
</script>

<style scoped>
.assessment-operational-panels { display: contents; }
</style>
