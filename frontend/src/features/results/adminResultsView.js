import { mapActions, mapState } from 'vuex';
import ResultsDialogs from '../../components/results/ResultsDialogs.vue';
import ResultsAttendancePanel from '../../components/results/ResultsAttendancePanel.vue';
import { AppRawButton, AppSelect } from '../../components/ui';
import computed from './adminResultsComputed';
import dataMethods from './adminResultsDataMethods';
import dialogMethods from './adminResultsDialogMethods';
import directoryMethods from './resultsDirectoryMethods';
import AppPagination from '../../components/ui/AppPagination.vue';

export default {
  name: 'AdminResultsView',
  components: {
    AppPagination,
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
  computed: { ...mapState(['dashboardSnapshot', 'currentUser']), ...computed },
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
    clearTimeout(this.resultsSearchTimer);
    if (this.attendanceSaveTimer) clearTimeout(this.attendanceSaveTimer);
  },
  methods: {
    ...mapActions(['loadDashboardSnapshot', 'ensureDashboardSnapshot', 'setManualAttendance', 'deleteCourse']),
    ...dataMethods,
    ...dialogMethods,
    ...directoryMethods,
  },
};
