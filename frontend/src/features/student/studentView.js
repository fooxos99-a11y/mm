import { mapActions, mapState } from 'vuex';
import TrainingMaterialsList from '../../components/TrainingMaterialsList.vue';
import StudentNavigation from '../../components/student/StudentNavigation.vue';
import StudentOverviewHeader from '../../components/student/StudentOverviewHeader.vue';
import StudentResultEntry from '../../components/student/StudentResultEntry.vue';
import StudentTopbar from '../../components/student/StudentTopbar.vue';
import CompletionRequirementsPanel from '../../components/completion/CompletionRequirementsPanel.vue';
import {
  buildResultDetailCards,
  calculateSubmissionScore,
  formatScoreValue,
  hasPendingManualReview,
  resolveCorrectAnswer as resolveCorrectAnswerValue,
  resolveStudentAnswer as resolveStudentAnswerValue,
} from '../results/resultModel.mjs';
import { fetchMyCompletionIndicators, fetchStudentAssignedReciter } from '../../services/api';

export default {
  name: 'StudentView',
  components: {
    StudentNavigation,
    StudentOverviewHeader,
    StudentResultEntry,
    StudentTopbar,
    CompletionRequirementsPanel,
    TrainingMaterialsList,
  },
  data() {
    return {
      loading: false,
      loadError: '',
      assignedReciter: null,
      studentIndicatorsPayload: null,
      mobileMenuOpen: false,
      activeSection: 'courses',
      selectedCourseId: '',
      selectedTaskId: '',
      expandedSection: '',
      studentMenu: [
        { id: 'courses', label: 'الدورات', icon: 'mdi-bookshelf' },
        { id: 'parts', label: 'الإقراء', icon: 'mdi-book-open-page-variant-outline' },
        { id: 'tasks', label: 'المهام الأدائية', icon: 'mdi-clipboard-text-outline' },
        { id: 'materials', label: 'الحقائب التدريبية', icon: 'mdi-folder-multiple-outline' },
        { id: 'indicators', label: 'المؤشرات', icon: 'mdi-chart-box-outline' },
        { id: 'final', label: 'الاختبار النهائي', icon: 'mdi-school-outline' },
      ],
    };
  },
  computed: {
    ...mapState(['currentUser', 'dashboardSnapshot']),
    hasStudentAccess() { return this.currentUser?.role === 'student'; },
    studentAccount() {
      const students = this.dashboardSnapshot?.students || [];
      return students.find((student) => String(student.loginId || student.loginCode || '')
        === String(this.currentUser?.loginCode || '')) || null;
    },
    currentStudentLogin() { return this.studentAccount?.loginId || this.studentAccount?.loginCode || ''; },
    currentBranchLabel() { return this.studentAccount?.branchId === 'female' ? 'معلمات' : 'معلمين'; },
    activeSectionTitle() {
      return this.studentMenu.find((item) => item.id === this.activeSection)?.label || 'حسابي';
    },
    activeSectionDescription() {
      if (this.activeSection === 'courses') return 'اختر الدورة ثم راجع التحضير أو نتائج القبلي والبعدي بنفس نمط لوحة النتائج.';
      if (this.activeSection === 'parts') return 'عرض الأجزاء المقروءة المسجلة على حسابك فقط بدون تعديل.';
      if (this.activeSection === 'tasks') return 'راجع المهام الأدائية ونتيجتك بنفس أسلوب لوحة التحكم.';
      if (this.activeSection === 'materials') return 'حمّل الملفات التدريبية والحقائب المعتمدة المضافة لك من لوحة الإدارة.';
      if (this.activeSection === 'indicators') return 'تابع مؤشرات اجتيازك الشخصية للحضور والمهام والاختبار النهائي وعرض القرآن.';
      return 'راجع نتيجة الاختبار النهائي وتفاصيل إجاباتك.';
    },
    trainingMaterials() {
      const branchId = this.studentAccount?.branchId || '';
      return (this.dashboardSnapshot?.trainingMaterials || [])
        .filter((material) => !material.targetBranchId || material.targetBranchId === branchId);
    },
    completedParts() {
      return [...(this.studentAccount?.completedParts || [])].sort((left, right) => left - right);
    },
    partsLimit() { return this.studentAccount?.branchId === 'female' ? 10 : 30; },
    allParts() { return Array.from({ length: this.partsLimit }, (_, index) => index + 1); },
    completedCount() { return this.completedParts.length; },
    courses() { return this.dashboardSnapshot?.courses || []; },
    submissions() { return this.dashboardSnapshot?.submissions || []; },
    attendance() { return this.dashboardSnapshot?.attendance || []; },
    finalExamSubmissions() { return this.dashboardSnapshot?.finalExamSubmissions || []; },
    finalExamQuestionsSource() { return this.dashboardSnapshot?.finalExamQuestions || []; },
    nonTaskCourses() { return this.courses.filter((course) => course.entityType !== 'task'); },
    taskCourses() { return this.courses.filter((course) => course.entityType === 'task'); },
    courseOptions() {
      return this.nonTaskCourses.map((course) => ({ label: course.title, value: course.id }));
    },
    taskOptions() {
      return this.taskCourses.map((course) => ({ label: course.title, value: course.id }));
    },
    selectedCourse() {
      return this.nonTaskCourses.find((course) => course.id === this.selectedCourseId) || null;
    },
    selectedTask() { return this.taskCourses.find((course) => course.id === this.selectedTaskId) || null; },
    preCourseQuestions() { return this.selectedCourse?.preQuestions || []; },
    postCourseQuestions() { return this.selectedCourse?.postQuestions || []; },
    preCourseSubmission() {
      if (!this.selectedCourse || !this.currentStudentLogin) return null;
      return [...this.submissions].filter((submission) => submission.courseId === this.selectedCourse.id
        && submission.assessmentType === 'pre' && submission.loginId === this.currentStudentLogin)
        .sort((left, right) => new Date(right.submittedAt || 0).getTime()
          - new Date(left.submittedAt || 0).getTime())[0] || null;
    },
    postCourseSubmission() {
      if (!this.selectedCourse || !this.currentStudentLogin) return null;
      return [...this.submissions].filter((submission) => submission.courseId === this.selectedCourse.id
        && submission.assessmentType === 'post' && submission.loginId === this.currentStudentLogin)
        .sort((left, right) => new Date(right.submittedAt || 0).getTime()
          - new Date(left.submittedAt || 0).getTime())[0] || null;
    },
    courseAttendancePresent() {
      if (!this.selectedCourse || !this.currentStudentLogin) return false;
      return this.attendance.some((record) => record.courseId === this.selectedCourse.id
        && record.loginId === this.currentStudentLogin);
    },
    preCourseScore() { return this.resolveSubmissionScore(this.preCourseQuestions, this.preCourseSubmission); },
    preCourseScoreLabel() {
      return this.formatResultScore(this.preCourseScore, this.preCourseSubmission, this.preCourseQuestions);
    },
    postCourseScore() { return this.resolveSubmissionScore(this.postCourseQuestions, this.postCourseSubmission); },
    postCourseScoreLabel() {
      return this.formatResultScore(this.postCourseScore, this.postCourseSubmission, this.postCourseQuestions);
    },
    preCourseDetailCards() { return this.buildDetailCards(this.preCourseQuestions, this.preCourseSubmission); },
    postCourseDetailCards() { return this.buildDetailCards(this.postCourseQuestions, this.postCourseSubmission); },
    taskQuestions() { return this.selectedTask?.taskQuestions || []; },
    selectedTaskSubmission() {
      if (!this.selectedTask || !this.currentStudentLogin) return null;
      return [...this.submissions].filter((submission) => submission.courseId === this.selectedTask.id
        && submission.assessmentType === 'tasks' && submission.loginId === this.currentStudentLogin)
        .sort((left, right) => new Date(right.submittedAt || 0).getTime()
          - new Date(left.submittedAt || 0).getTime())[0] || null;
    },
    taskScore() { return this.resolveSubmissionScore(this.taskQuestions, this.selectedTaskSubmission); },
    taskScoreLabel() {
      if (!this.selectedTaskSubmission) return 'غير مرسل';
      return {
        approved: 'معتمد', rejected: 'مرفوض', pending: 'بانتظار المراجعة',
      }[this.selectedTaskSubmission.taskReviewStatus] || 'بانتظار المراجعة';
    },
    taskDetailCards() {
      return this.buildDetailCards(this.taskQuestions, this.selectedTaskSubmission, {
        richTextAnswers: this.selectedTask?.taskMode === 'document',
      });
    },
    finalExamQuestions() {
      if (!this.studentAccount?.branchId) return [];
      return [...this.finalExamQuestionsSource]
        .filter((question) => question.branchCode === this.studentAccount.branchId)
        .sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0));
    },
    finalExamSubmission() {
      if (!this.currentStudentLogin) return null;
      return this.finalExamSubmissions
        .find((submission) => submission.loginCode === this.currentStudentLogin) || null;
    },
    finalExamScore() { return this.resolveSubmissionScore(this.finalExamQuestions, this.finalExamSubmission); },
    finalExamScoreLabel() {
      return this.formatResultScore(this.finalExamScore, this.finalExamSubmission, this.finalExamQuestions);
    },
    finalExamDetailCards() { return this.buildDetailCards(this.finalExamQuestions, this.finalExamSubmission); },
    indicatorStudent() { return this.studentIndicatorsPayload?.student || null; },
  },
  watch: {
    'currentUser.loginCode': { immediate: true, handler() { this.prepareStudentView(); } },
    nonTaskCourses: {
      immediate: true,
      handler(courses) {
        if (!courses.length) {
          this.selectedCourseId = '';
          return;
        }
        if (!courses.some((course) => course.id === this.selectedCourseId)) {
          this.selectedCourseId = courses.find((course) => course.isActive)?.id || courses[0].id;
        }
      },
    },
    taskCourses: {
      immediate: true,
      handler(courses) {
        if (!courses.length) {
          this.selectedTaskId = '';
          return;
        }
        if (!courses.some((course) => course.id === this.selectedTaskId)) this.selectedTaskId = courses[0].id;
      },
    },
    selectedCourseId() {
      if (String(this.expandedSection || '').startsWith('course-')) this.expandedSection = '';
    },
    selectedTaskId() { if (this.expandedSection === 'task') this.expandedSection = ''; },
  },
  methods: {
    ...mapActions(['loadDashboardSnapshot']),
    selectSection(sectionId) {
      this.activeSection = sectionId;
      this.mobileMenuOpen = false;
      this.expandedSection = '';
    },
    toggleExpandedSection(section) {
      this.expandedSection = this.expandedSection === section ? '' : section;
    },
    resolveSubmissionScore(questions, submission) { return calculateSubmissionScore(questions, submission); },
    formatScore(value) { return formatScoreValue(value); },
    formatResultScore(score, submission, questions) {
      if (!submission) return 'غير مرسل';
      const total = questions.reduce((sum, question) => sum + Number(question.points || 0), 0);
      if (!total) return `${(submission.answers || []).length} إجابة`;
      if (hasPendingManualReview(questions, submission)) return 'بانتظار التصحيح اليدوي';
      return `${this.formatScore(score)} / ${this.formatScore(total)}`;
    },
    resolveStudentAnswer(answer) { return resolveStudentAnswerValue(answer); },
    resolveCorrectAnswer(question) { return resolveCorrectAnswerValue(question); },
    buildDetailCards(questions, submission, options = {}) {
      return buildResultDetailCards(questions, submission, options);
    },
    async prepareStudentView() {
      if (!this.hasStudentAccess || !this.currentUser?.loginCode) {
        this.assignedReciter = null;
        this.studentIndicatorsPayload = null;
        this.loadError = '';
        return;
      }
      this.loading = true;
      this.loadError = '';
      try {
        const [, assignedReciter, indicatorsPayload] = await Promise.all([
          this.loadDashboardSnapshot(),
          fetchStudentAssignedReciter(this.currentUser.loginCode),
          fetchMyCompletionIndicators(),
        ]);
        this.assignedReciter = assignedReciter;
        this.studentIndicatorsPayload = indicatorsPayload;
      } catch (error) {
        this.assignedReciter = null;
        this.studentIndicatorsPayload = null;
        this.loadError = error?.response?.data?.message || 'تعذر تحميل بيانات الطالب.';
      } finally {
        this.loading = false;
      }
    },
  },
};
