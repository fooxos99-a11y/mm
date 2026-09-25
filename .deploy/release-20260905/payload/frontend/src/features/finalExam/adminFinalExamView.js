import { mapActions, mapState } from 'vuex';
import AssessmentExistingQuestionList from '../../components/assessment/AssessmentExistingQuestionList.vue';
import AssessmentQuestionBuilder from '../../components/assessment/AssessmentQuestionBuilder.vue';
import FinalExamDialogs from '../../components/finalExam/FinalExamDialogs.vue';
import { AppChoiceButton, AppSelect } from '../../components/ui';
import indicatorAnimation from '../../mixins/indicatorAnimation';
import { finalExamBranchMethods } from './finalExamBranchMethods';
import { finalExamIndicatorMethods } from './finalExamIndicatorMethods';
import { finalExamQuestionMethods } from './finalExamQuestionMethods';
import { createFinalExamState } from './finalExamViewModel.mjs';

export default {
  name: 'AdminFinalExamView',
  components: { AssessmentExistingQuestionList, AssessmentQuestionBuilder, FinalExamDialogs, AppChoiceButton, AppSelect },
  mixins: [indicatorAnimation],
  props: { embedded: { type: Boolean, default: false } },
  data: createFinalExamState,
  computed: {
    ...mapState(['dashboardSnapshot', 'dashboardError', 'currentUser']),
    managedBranchId() {
      if (this.currentUser?.role === 'male_manager') return 'male';
      if (this.currentUser?.role === 'female_manager') return 'female';
      return '';
    },
    settings() {
      return this.dashboardSnapshot?.finalExamSettings || {
        male: { isEnabled: false, closesAt: null }, female: { isEnabled: false, closesAt: null },
      };
    },
    students() { return this.dashboardSnapshot?.students || []; },
    finalExamSubmissions() { return this.dashboardSnapshot?.finalExamSubmissions || []; },
    showBranchCards() { return false; },
    branchQuestions() {
      const targetBranch = this.managedBranchId || this.selectedBranch;
      return (this.dashboardSnapshot?.finalExamQuestions || []).filter(question => question.branchCode === targetBranch);
    },
    visibleBranchQuestions() { return this.branchQuestions.filter(question => !this.pendingDeletedQuestionIds.includes(question.id)); },
    currentBranchLabel() {
      return this.branchOptions.find(branch => branch.value === (this.managedBranchId || this.selectedBranch))?.label || 'هذا الفرع';
    },
    targetBranchLabel() { return this.branchOptions.find(branch => branch.value !== this.selectedBranch)?.label || 'الفرع الآخر'; },
    activationBranchOptions() {
      return [{ label: 'معلمين', value: 'male' }, { label: 'معلمات', value: 'female' }, { label: 'الكل', value: 'all' }];
    },
    activeBranches() { return ['male', 'female'].filter(branchCode => this.isBranchActive(branchCode)); },
    indicatorStudents() { return this.students.filter(student => student.branchId === (this.managedBranchId || this.indicatorBranch)); },
    finalExamIndicator() {
      const totalStudents = this.indicatorStudents.length;
      if (!totalStudents) return { submitted: 0, totalStudents: 0, percent: 0 };
      const submittedLogins = new Set(this.finalExamSubmissions
        .filter(submission => submission.branchCode === (this.managedBranchId || this.indicatorBranch))
        .map(submission => submission.loginCode).filter(Boolean));
      const submitted = this.indicatorStudents.reduce((sum, student) => sum + (submittedLogins.has(student.loginId) ? 1 : 0), 0);
      return { submitted, totalStudents, percent: Math.round((submitted / totalStudents) * 100) };
    },
    finalExamIndicatorStyle() { return this.buildIndicatorRingStyle(this.finalExamIndicator.percent); },
    indicatorAnimationSignature() {
      return [this.indicatorBranch, this.finalExamIndicator.percent, this.finalExamIndicator.submitted,
        this.finalExamIndicator.totalStudents].join('|');
    },
    hasAnyActiveBranch() { return this.activeBranches.length > 0; },
    manageOptions() {
      if (this.activeBranches.length === 2) return [
        { value: 'close_all', label: 'إغلاق الكل' }, { value: 'close_male', label: 'إغلاق معلمين' },
        { value: 'close_female', label: 'إغلاق معلمات' },
      ];
      if (this.activeBranches.length === 1) {
        const activeBranch = this.activeBranches[0];
        const inactiveBranch = activeBranch === 'male' ? 'female' : 'male';
        return [
          { value: `close_${activeBranch}`, label: `إغلاق ${this.branchLabel(activeBranch)}` },
          { value: `open_${inactiveBranch}`, label: `فتح ${this.branchLabel(inactiveBranch)}` },
          { value: 'open_all', label: 'فتح الكل' },
        ];
      }
      return [];
    },
  },
  watch: {
    managedBranchId: { immediate: true, handler(value) {
      if (value) { this.selectedBranch = value; this.indicatorBranch = value; this.activationBranch = value; }
    } },
    selectedBranch: { immediate: true, handler() {
      this.syncBranchState(); this.questionForms = []; this.questionErrors = []; this.pendingDeletedQuestionIds = [];
    } },
    branchQuestions: { immediate: true, handler(questions) { this.syncQuestionDrafts(questions); } },
    dashboardSnapshot: { deep: true, handler() { this.syncBranchState(); } },
    indicatorAnimationSignature: { immediate: true, handler() { this.$nextTick(() => this.restartIndicatorAnimation()); } },
  },
  created() {
    this.countdownTimer = window.setInterval(() => { this.currentTimestamp = Date.now(); }, 1000);
    if (!this.dashboardSnapshot) this.loadDashboardSnapshot();
  },
  beforeUnmount() {
    if (this.countdownTimer) window.clearInterval(this.countdownTimer);
    this.countdownTimer = null;
  },
  methods: {
    ...mapActions(['loadDashboardSnapshot', 'addFinalExamQuestion', 'updateFinalExamQuestion',
      'deleteFinalExamQuestion', 'toggleFinalExamEnabled', 'copyFinalExamQuestions']),
    ...finalExamIndicatorMethods,
    ...finalExamBranchMethods,
    ...finalExamQuestionMethods,
  },
};
