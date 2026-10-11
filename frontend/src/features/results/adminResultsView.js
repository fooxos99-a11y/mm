import { mapActions, mapState } from 'vuex';
import ResultsDialogs from '../../components/results/ResultsDialogs.vue';
import ResultsGradeDialog from '../../components/results/ResultsGradeDialog.vue';
import ResultsAttendancePanel from '../../components/results/ResultsAttendancePanel.vue';
import { AppButton, AppRawButton, AppSelect } from '../../components/ui';
import computed from './adminResultsComputed';
import dataMethods from './adminResultsDataMethods';
import dialogMethods from './adminResultsDialogMethods';
import directoryMethods from './resultsDirectoryMethods';
import AppPagination from '../../components/ui/AppPagination.vue';
import gradeMethods from './gradeEntryMethods';
import { gradeChanges } from './gradeEntryModel.mjs';

export default {
  name: 'AdminResultsView',
  components: {
    AppPagination,
    AppButton,
    ResultsGradeDialog,
    AppRawButton,
    AppSelect,
    ResultsAttendancePanel,
    ResultsDialogs,
  },
  props: {
    embedded: { type: Boolean, default: false },
    panelMode: { type: String, default: '' },
  },
  data() {
    return {
      resultsCatalog: [], resultsCatalogReady: false, resultSnapshot: null,
      resultsSearch: '', resultsLoading: false, resultsError: '', resultsPage: 1,
      resultsGeneration: 0, resultsController: null, resultsSearchTimer: null,
      gradeDialogOpen: false, gradeRows: [], gradeScope: {}, gradeSearch: '', gradeTotal: '',
      gradeLoading: false, gradeSaving: false, gradeTotalLocked: false, gradeErrors: {}, gradeError: '',
      gradeConflict: false, gradeLoadFailed: false, gradeGeneration: 0, gradeController: null,
      attendanceCourseId: '',
      attendanceBranchId: 'male',
      attendanceChecked: [],
      attendanceSaveTimer: null,
      isSavingAttendance: false,
      saveStatusText: '',
      resultsCourseId: '',
      resultsBranchId: 'male',
      resultsType: '',
      studentFilter: '',
      resultDialogOpen: false,
      selectedResultLoginId: '',
      scoreEditValue: null,
      isSavingScore: false,
      answerScoreValues: {},
      savingAnswerId: '',
      courseDeleteDialogOpen: false,
      courseDeleteId: '',
      courseDeleteTitle: '',
      courseDeleteEntityType: 'course',
      deletingCourseId: '',
      branchOptions: [
        { label: 'معلمين', value: 'male' },
        { label: 'معلمات', value: 'female' },
      ],
    };
  },
  computed: {
    ...mapState(['dashboardSnapshot', 'currentUser']), ...computed,
    canEnterGrades() {
      return !this.isAttendanceMode && this.isCourseResultsSection && ['pre', 'post'].includes(this.resultsType)
        && ['admin', 'male_manager', 'female_manager'].includes(this.currentUser?.role);
    },
    gradeChangedCount() { return gradeChanges(this.gradeRows).length; },
  },
  watch: {
    courseOptions: {
      immediate: true,
      handler(options) {
        if (!this.attendanceCourseId
          || !options.some((option) => option.value === this.attendanceCourseId)) {
          this.attendanceCourseId = options[0]?.value || '';
        }
      },
    },
    resultsCourseOptions: {
      immediate: true,
      handler(options) {
        if (this.resultsCourseId
          && !options.some((option) => option.value === this.resultsCourseId)) {
          this.resultsCourseId = '';
        }
      },
    },
    resultsType() {
      this.queueResultsPage();
      if (!this.studentFilterOptions.some((option) => option.value === this.studentFilter)) {
        this.studentFilter = this.studentFilterOptions[0]?.value || '';
      }
      this.closeResultDialog();
    },
    studentFilterOptions: {
      immediate: true,
      handler(options) {
        if (!options.some((option) => option.value === this.studentFilter)) {
          this.studentFilter = options[0]?.value || '';
        }
      },
    },
    selectedAttendanceRecords: {
      immediate: true,
      handler(records) {
        this.attendanceChecked = records.map((record) => {
          const student = this.students.find((item) => item.loginId === record.loginId);
          return student?.id || null;
        }).filter(Boolean);
      },
    },
    resultsCourseId() {
      this.queueResultsPage();
      if (!this.studentFilterOptions.some((option) => option.value === this.studentFilter)) {
        this.studentFilter = this.studentFilterOptions[0]?.value || '';
      }
      this.closeResultDialog();
    },
    resultsBranchId() {
      this.queueResultsPage();
      this.studentFilter = this.studentFilterOptions[0]?.value || '';
      this.closeResultDialog();
    },
    resultDialogOpen(opened) {
      if (opened && this.selectedResultRow?.submission) {
        const current = this.selectedResultRow.submission.manualScore;
        this.scoreEditValue = current !== null && current !== undefined ? Number(current) : null;
        this.initializeAnswerScoreValues();
      }
    },
    studentFilter() { this.queueResultsPage(); },
  },
  created() {
    if (this.managedBranchId) {
      this.attendanceBranchId = this.managedBranchId;
      this.resultsBranchId = this.managedBranchId;
    }
    if (this.isAttendanceMode) {
      this.loadDashboardSnapshot();
    } else {
      this.loadResultsCatalog();
      if (!this.dashboardSnapshot) this.ensureDashboardSnapshot({ mode: 'shell' });
    }
  },
  beforeUnmount() {
    this.resultsGeneration++;
    this.resultsController?.abort();
    this.gradeController?.abort();
    this.gradeGeneration++;
    clearTimeout(this.resultsSearchTimer);
    if (this.attendanceSaveTimer) clearTimeout(this.attendanceSaveTimer);
  },
  methods: {
    ...mapActions(['loadDashboardSnapshot', 'ensureDashboardSnapshot', 'setManualAttendance', 'deleteCourse']),
    ...dataMethods,
    ...dialogMethods,
    ...directoryMethods,
    ...gradeMethods,
  },
};
