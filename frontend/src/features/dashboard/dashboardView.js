import { mapActions, mapState } from 'vuex';
import DashboardManagementDialogs from '../../components/dashboard/DashboardManagementDialogs.vue';
import DashboardOverviewPanel from '../../components/dashboard/DashboardOverviewPanel.vue';
import DashboardSidebar from '../../components/dashboard/DashboardSidebar.vue';
import DashboardTopbar from '../../components/dashboard/DashboardTopbar.vue';
import DashboardUtilityDialogs from '../../components/dashboard/DashboardUtilityDialogs.vue';
import indicatorAnimation from '../../mixins/indicatorAnimation';
import computed from './dashboardComputed';
import navigationMethods from './dashboardNavigationMethods';
import utilityMethods from './dashboardUtilityMethods';
import watchers from './dashboardWatchers';
import workspaceMethods from './dashboardWorkspaceMethods';
import {
  AdminArchiveView, AdminAssessmentView, AdminCommunicationsView,
  AdminCompletionRequirementsView, AdminFinalExamView, AdminPeopleView,
  AdminPermissionsView, AdminResultsView, AdminSatisfactionView, AdminSettingsView,
  AdminTasksView, AdminTrainingMaterialsView,
} from './dashboardViews';

export default {
  name: 'DashboardView',
  components: {
    DashboardManagementDialogs,
    DashboardOverviewPanel,
    DashboardSidebar,
    DashboardTopbar,
    DashboardUtilityDialogs,
    AdminAssessmentView,
    AdminTasksView,
    AdminFinalExamView,
    AdminPeopleView,
    AdminCommunicationsView,
    AdminTrainingMaterialsView,
    AdminResultsView,
    AdminCompletionRequirementsView,
    AdminSatisfactionView,
    AdminPermissionsView,
    AdminArchiveView,
    AdminSettingsView,
  },
  mixins: [indicatorAnimation],
  data() {
    return {
      mobileMenuOpen: false,
      activeMenu: 'overview',
      panelLoading: false,
      selectedOverviewBranch: 'all',
      linksDialogOpen: false,
      adminsDialogOpen: false,
      templatesDialogOpen: false,
      templatesSubmitting: false,
      accountsPanelBusy: false,
      selectedTemplateCourseId: '',
      selectedSatisfactionCourseId: '',
      templateDraft: { pre: '', post: '', tasks: '' },
      satisfactionAddDialogOpen: false,
      satisfactionDeleteDialogOpen: false,
      satisfactionSubmitting: false,
      satisfactionDeleting: false,
      satisfactionQuestionDraft: { prompt: '', type: 'rating', isRequired: true },
      selectedSatisfactionDeleteKey: '',
      finalExamTopbarState: {
        branchCode: 'male', branchLabel: 'معلمين', isEnabled: false, closesAt: null, timers: [],
      },
      assessmentTopbarState: {
        visible: false, label: '', type: '', isEnabled: false, closesAt: null, timers: [],
      },
      registrationTopbarState: { isOpen: false, loading: false },
      permissionsTopbarState: { isAdmin: false, activeSection: 'permissions' },
      completionTopbarState: { canEditSettings: false, canCloseResults: false, isClosed: false },
      currentTimestamp: Date.now(),
      dashboardClockIntervalId: null,
      settingsMenuOpen: false,
      selectedSettingsItemId: '',
    };
  },
  computed: {
    ...mapState(['dashboardSnapshot', 'dashboardLoading', 'dashboardError', 'currentUser']),
    ...computed,
  },
  watch: watchers,
  created() {
    this.dashboardClockIntervalId = window.setInterval(() => { this.currentTimestamp = Date.now(); }, 1000);
    this.initializeDashboard();
  },
  mounted() {
    this.restartIndicatorAnimation();
  },
  beforeUnmount() {
    if (this.dashboardClockIntervalId) window.clearInterval(this.dashboardClockIntervalId);
  },
  methods: {
    ...mapActions([
      'loadDashboardSnapshot', 'ensureDashboardSnapshot', 'updateCourse', 'addSatisfactionQuestion', 'deleteSatisfactionQuestions',
    ]),
    ...workspaceMethods,
    ...navigationMethods,
    ...utilityMethods,
    updateTemplateDraft({ key, value }) {
      if (['pre', 'post', 'tasks'].includes(key)) this.templateDraft[key] = value;
    },
  },
};
