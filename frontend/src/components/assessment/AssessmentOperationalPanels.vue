<template>
  <AppCard class="prep-card admin-workspace-card">
    <AssessmentCourseToolbar
      :columns="3"
      :course-value="courseValue"
      :course-options="courseOptions"
      :course-placeholder="coursePlaceholder"
      :view-mode="viewMode"
      :selected-course="selectedCourse"
      :mode-options="modeOptions"
      :can-edit="canManageCatalog"
      :deleting-course-id="deletingCourseId"
      :changing-context="changingContext"
      @update:course-value="$emit('update:course-value', $event)"
      @update:view-mode="$emit('update:view-mode', $event)"
      @create-course="$emit('create-course')"
      @edit-course="$emit('edit-course', $event)"
      @move-course="$emit('move-course', $event)"
      @delete-course="$emit('delete-course', $event)"
    >
      <template #branch>
        <AppFilterField
          v-if="!managedBranchId"
          :for-id="branchId"
          label="الفرع"
        >
          <AppSelect
            :id="branchId"
            :value="mode === 'indicators' ? indicatorBranch : attendanceBranch"
            :items="mode === 'indicators' ? indicatorBranchOptions : attendanceBranchOptions"
            :disabled="changingContext"
            item-text="label"
            item-value="value"
            dense
            outlined
            hide-details
            class="assessment-select"
            @input="$emit(mode === 'indicators' ? 'update:indicator-branch' : 'update:attendance-branch', $event)"
          />
        </AppFilterField>
      </template>
    </AssessmentCourseToolbar>
    <AttendanceSessionControl
      v-if="mode === 'attendance' && selectedCourse"
      :key="selectedCourse.id"
      :course="selectedCourse"
      :branch="managedBranchId || attendanceBranch"
      :can-edit="canEdit"
      :saving="savingAttendance"
      @enrollments="$emit('enrollments', $event)"
      @select="$emit('select-session', $event)"
    />
    <AppLoadingSpinner
      v-if="loading"
      label="جارٍ تحميل البيانات"
    />
    <AppEmptyState
      v-else-if="!selectedCourse"
      title-tag="h2"
      title="اختر دورة لعرض البيانات"
    />
    <template v-else-if="mode === 'indicators'">
      <AppEmptyState
        v-if="!totalStudents"
        title-tag="h2"
        title="لا يوجد معلمون في الفرع المحدد"
      />
      <AssessmentIndicators
        v-else
        :pre="preIndicator"
        :post="postIndicator"
        :pre-value="preValue"
        :post-value="postValue"
        :total-students="totalStudents"
        :difference="scoreDifference"
      />
    </template>
    <AssessmentAttendanceList
      v-else
      :key="`${courseValue}-${attendanceBranch}`"
      :students="students"
      :checked-ids="checkedIds"
      :all-checked="allChecked"
      :can-edit="canEdit && (!selectedSession || selectedSession.isOpen)"
      :saving="savingAttendance"
      :save-status="saveStatus"
      @toggle-all="$emit('toggle-all')"
      @toggle-student="$emit('toggle-student', $event)"
      @save="$emit('save-attendance')"
    />
  </AppCard>
</template>
<script>
import { AppCard, AppEmptyState, AppFilterField, AppLoadingSpinner, AppSelect } from '../ui';
import AssessmentCourseToolbar from './AssessmentCourseToolbar.vue';
import AssessmentIndicators from './AssessmentIndicators.vue';
import AssessmentAttendanceList from './AssessmentAttendanceList.vue';
import AttendanceSessionControl from './AttendanceSessionControl.vue';

export default {
  name: 'AssessmentOperationalPanels',
  components: { AttendanceSessionControl, AppCard, AppEmptyState, AppFilterField, AppLoadingSpinner, AppSelect, AssessmentCourseToolbar, AssessmentIndicators, AssessmentAttendanceList },
  props: {
    mode: { type: String, default: '' }, courseValue: { type: String, default: '' },
    courseOptions: { type: Array, default: () => [] }, coursePlaceholder: { type: String, default: '' },
    viewMode: { type: String, default: '' }, modeOptions: { type: Array, default: () => [] },
    canEdit: Boolean, canManageCatalog: Boolean, loading: Boolean, changingContext: Boolean,
    deletingCourseId: { type: String, default: '' }, managedBranchId: { type: String, default: '' },
    indicatorBranch: { type: String, default: '' }, indicatorBranchOptions: { type: Array, default: () => [] },
    selectedCourse: { type: Object, default: null }, totalStudents: { type: Number, default: 0 },
    preValue: { type: String, default: '0' }, postValue: { type: String, default: '0' },
    preIndicator: { type: Object, required: true }, postIndicator: { type: Object, required: true },
    scoreDifference: { type: Number, default: 0 },
    saveStatus: { type: String, default: '' }, savingAttendance: Boolean,
    attendanceBranch: { type: String, default: '' }, attendanceBranchOptions: { type: Array, default: () => [] },
    students: { type: Array, default: () => [] }, checkedIds: { type: Array, default: () => [] },
    allChecked: Boolean,
    selectedSession: { type: Object, default: null },
  },
  emits: ['enrollments', 'select-session', 'update:course-value', 'update:view-mode', 'create-course', 'edit-course', 'move-course', 'delete-course', 'update:indicator-branch', 'update:attendance-branch', 'toggle-all', 'toggle-student', 'save-attendance'],
  computed: { branchId() { return this.mode === 'indicators' ? 'assessment-indicators-branch' : 'assessment-attendance-branch'; } },
};
</script>
