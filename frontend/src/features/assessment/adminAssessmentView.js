import { mapActions, mapState } from 'vuex';
import { getCurrentInstance } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';
import AssessmentEditorHeader from '../../components/assessment/AssessmentEditorHeader.vue';
import AssessmentEditorDialogs from '../../components/assessment/AssessmentEditorDialogs.vue';
import AssessmentAvailabilityDialogs from '../../components/assessment/AssessmentAvailabilityDialogs.vue';
import AssessmentCourseDialogs from '../../components/assessment/AssessmentCourseDialogs.vue';
import AssessmentCourseToolbar from '../../components/assessment/AssessmentCourseToolbar.vue';
import AssessmentDocumentWorkspace from '../../components/assessment/AssessmentDocumentWorkspace.vue';
import AssessmentExistingQuestionList from '../../components/assessment/AssessmentExistingQuestionList.vue';
import AssessmentOperationalPanels from '../../components/assessment/AssessmentOperationalPanels.vue';
import AssessmentQuestionBuilder from '../../components/assessment/AssessmentQuestionBuilder.vue';
import {
  AppButton, AppCard, AppChoiceButton, AppIconButton, AppLoadingSpinner,
} from '../../components/ui';
import { normalizeAssessmentAnswer } from '../assessmentQuestions/questionModel.mjs';
import { useIndicatorAnimation } from '../../composables/useIndicatorAnimation';
import computed from './adminAssessmentComputed';
import watchers from './adminAssessmentWatchers';
import availabilityMethods from './assessmentAvailabilityMethods';
import courseMethods from './assessmentCourseMethods';
import indicatorMethods from './assessmentIndicatorMethods';
import questionMethods from './assessmentQuestionMethods';
import templateMethods from './assessmentTemplateMethods';
import { assessmentLabels } from './adminAssessmentConfig';
import workspaceUiMethods, { editorComputed } from './assessmentWorkspaceUi';

export default {
  name: 'AdminAssessmentView',
  components: {
    AssessmentAvailabilityDialogs,
    AssessmentCourseDialogs,
    AssessmentCourseToolbar,
    AssessmentDocumentWorkspace,
    AssessmentExistingQuestionList,
    AssessmentOperationalPanels,
    AssessmentQuestionBuilder,
    AssessmentEditorHeader,
    AssessmentEditorDialogs,
    AppButton,
    AppLoadingSpinner,
    AppChoiceButton,
    AppCard,
    AppIconButton,
  },
  setup() {
    const instance = getCurrentInstance();
    onBeforeRouteLeave(() => instance.proxy.confirmDiscardChanges());
    onBeforeRouteUpdate((to, from) => {
      if (to.query.panel !== from.query.panel || to.query.courseId !== from.query.courseId || to.params.assessmentType !== from.params.assessmentType || to.query.assessmentType !== from.query.assessmentType) {
        return instance.proxy.confirmDiscardChanges();
      }
      return true;
    });
    return useIndicatorAnimation();
  },
  props: {
    embedded: { type: Boolean, default: false },
    assessmentTypeOverride: { type: String, default: '' },
    courseIdOverride: { type: String, default: '' },
    skipInitialLoad: { type: Boolean, default: false },
    clockTimestamp: { type: Number, default: 0 },
    initialSelection: { type: Object, default: () => ({}) },
  },
  data() {
    return {
      assessmentLabels,
      discardChangesDialogOpen: false,
      discardChangesPromise: null,
      discardChangesResolve: null,
      questionDraftContext: '',
      workspaceChangeRevisions: {},
      pendingWorkspaceChanges: 0,
      selectedCourseId: this.courseIdOverride || this.$route.query.courseId ? '' : (this.initialSelection.courseId || ''),
      viewMode: this.embedded ? 'attendance' : '',
      selectedDetailAssessmentType: '',
      questionForms: [],
      questionErrors: [],
      questionDrafts: {},
      questionDraftErrors: {},
      pendingDeletedQuestionIds: [],
      isSaving: false,
      templateDraft: '',
      taskVideoUrlDraft: '',
      taskDescriptionDraft: '',
      templateSaving: false,
      courseCreateDialogOpen: false,
      courseCreateTitle: '',
      courseCreateMode: 'questions',
      courseCreateQuestionType: '',
      courseCreateTemplateDraft: '',
      courseCreateVideoUrlDraft: '',
      courseCreateDescriptionDraft: '',
      taskPointsDraft: '1',
      courseCreateSubmitting: false,
      courseEditDialogOpen: false,
      courseEditId: '',
      courseEditTitle: '',
      courseEditSubmitting: false,
      deletingCourseId: '',
      courseDeleteDialogOpen: false,
      courseDeleteId: '',
      courseDeleteTitle: '',
      assessmentDeleteSubmitting: false,
      assessmentAvailabilityDialogOpen: false,
      assessmentAvailabilityCourseId: '',
      assessmentAvailabilityType: 'pre',
      assessmentAvailabilityBranch: 'all',
      assessmentAvailabilityPreserveActiveBranches: false,
      assessmentAvailabilityMinutes: 60,
      assessmentAvailabilitySubmitting: false,
      assessmentManageDialogOpen: false,
      assessmentManageCourseId: '',
      assessmentManageType: 'pre',
      assessmentManageChoice: '',
      assessmentManageSubmitting: false,
      assessmentIndicatorsBranch: 'all',
      attendanceBranchId: 'male',
      attendanceChecked: [],
      selectedAttendanceSession: null,
      attendanceEnrollmentIds: null,
      attendanceRemovedIds: [],
      isSavingAttendance: false,
      saveStatusText: '',
      attendanceSaveTimer: null,
      attendanceSavePromise: null,
      currentTimestamp: Date.now(),
      assessmentCountdownTimer: null,
    };
  },
  computed: {
    ...mapState(['dashboardSnapshot', 'dashboardLoading', 'dashboardError', 'currentUser']),
    ...computed,
    ...editorComputed,
  },
  watch: watchers,
  created() {
    if (!this.clockTimestamp) {
      this.assessmentCountdownTimer = window.setInterval(() => { this.currentTimestamp = Date.now(); }, 1000);
    }
    if (!this.skipInitialLoad && !this.dashboardSnapshot) this.loadDashboardSnapshot();
  },
  mounted() {
    this.assessmentBeforeUnload = event => {
      if (!this.hasUnsavedAssessmentChanges && !this.isSaving && !this.templateSaving && !this.attendanceSaveTimer && !this.isSavingAttendance && this.saveStatusText !== 'تعذر حفظ التحضير') return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', this.assessmentBeforeUnload);
  },
  beforeUnmount() {
    if (this.attendanceSaveTimer) clearTimeout(this.attendanceSaveTimer);
    if (this.assessmentCountdownTimer) window.clearInterval(this.assessmentCountdownTimer);
    window.removeEventListener('beforeunload', this.assessmentBeforeUnload);
    this.discardChangesResolve?.(false);
  },
  methods: {
    ...mapActions([
      'loadDashboardSnapshot', 'addCourse', 'addQuestion', 'updateQuestion', 'deleteQuestion',
      'updateCourse', 'deleteCourse', 'activateCourse', 'reorderCourses', 'syncCourseQuestions', 'setManualAttendance',
    ]),
    normalizeAnswer: normalizeAssessmentAnswer,
    ...indicatorMethods,
    ...courseMethods,
    ...availabilityMethods,
    ...questionMethods,
    ...templateMethods,
    ...workspaceUiMethods,
  },
};
