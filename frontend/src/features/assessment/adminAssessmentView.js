import { mapActions, mapState } from 'vuex';
import AssessmentAvailabilityDialogs from '../../components/assessment/AssessmentAvailabilityDialogs.vue';
import AssessmentCourseDialogs from '../../components/assessment/AssessmentCourseDialogs.vue';
import AssessmentCourseToolbar from '../../components/assessment/AssessmentCourseToolbar.vue';
import AssessmentDocumentWorkspace from '../../components/assessment/AssessmentDocumentWorkspace.vue';
import AssessmentExistingQuestionList from '../../components/assessment/AssessmentExistingQuestionList.vue';
import AssessmentOperationalPanels from '../../components/assessment/AssessmentOperationalPanels.vue';
import AssessmentQuestionBuilder from '../../components/assessment/AssessmentQuestionBuilder.vue';
import {
  AppChoiceButton, AppIconButton,
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
    AppChoiceButton,
    AppIconButton,
  },
  setup() {
    return useIndicatorAnimation();
  },
  props: {
    embedded: { type: Boolean, default: false },
    assessmentTypeOverride: { type: String, default: '' },
    courseIdOverride: { type: String, default: '' },
    skipInitialLoad: { type: Boolean, default: false },
    clockTimestamp: { type: Number, default: 0 },
  },
  data() {
    return {
      assessmentLabels,
      selectedCourseId: '',
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
      isSavingAttendance: false,
      saveStatusText: '',
      attendanceSaveTimer: null,
      currentTimestamp: Date.now(),
      assessmentCountdownTimer: null,
    };
  },
  computed: {
    ...mapState(['dashboardSnapshot', 'dashboardLoading', 'dashboardError', 'currentUser']),
    ...computed,
  },
  watch: watchers,
  created() {
    if (!this.clockTimestamp) {
      this.assessmentCountdownTimer = window.setInterval(() => { this.currentTimestamp = Date.now(); }, 1000);
    }
    if (!this.skipInitialLoad && !this.dashboardSnapshot) this.loadDashboardSnapshot();
  },
  beforeUnmount() {
    if (this.attendanceSaveTimer) clearTimeout(this.attendanceSaveTimer);
    if (this.assessmentCountdownTimer) window.clearInterval(this.assessmentCountdownTimer);
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
  },
};
