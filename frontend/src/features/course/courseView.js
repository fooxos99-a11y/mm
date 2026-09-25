import AttachmentPreviewDialog from '../../components/tasks/AttachmentPreviewDialog.vue';
import { AppButton, AppChoiceButton } from '../../components/ui';
import { ASSESSMENT_LABELS } from './courseViewConfig';
import courseMethods from './courseViewMethods';
export default {
  name: 'CourseView',
  components: {
    AttachmentPreviewDialog,
    AppButton,
    AppChoiceButton,
  },
  props: {
    assessmentType: {
      type: String,
      default: 'post',
    },
  },
  data() {
    return {
      publicSnapshot: null,
      publicLoading: false,
      publicError: '',
      answers: {},
      files: {},
      satisfactionAnswers: {},
      satisfactionError: '',
      pageError: '',
      studentLoginId: '',
      studentResolved: false,
      submitting: false,
      previewDialogOpen: false,
      previewAttachment: null,
      resetKey: 0,
      currentTimestamp: Date.now(),
      assessmentClockTimer: null,
      publicLoadingGuardTimer: null,
      publicAutoRefreshTimer: null,
      publicRefreshInFlight: false,
    };
  },
  computed: {
    currentUser() {
      return this.$store?.state?.currentUser || null;
    },
    dashboardSnapshot() {
      return this.publicSnapshot;
    },
    dashboardLoading() {
      return this.publicLoading;
    },
    dashboardError() {
      return this.publicError;
    },
    resolvedAssessmentType() {
      return ['pre', 'post', 'tasks'].includes(this.assessmentType) ? this.assessmentType : 'post';
    },
    assessmentLabel() {
      return ASSESSMENT_LABELS[this.resolvedAssessmentType] || ASSESSMENT_LABELS.post;
    },
    authenticatedStudentLogin() {
      return ['student', 'trainee'].includes(this.currentUser?.role)
        ? String(this.currentUser.loginCode || '').trim()
        : '';
    },
    student() {
      const students = this.dashboardSnapshot?.students || [];
      const loginCode = this.studentLoginId || '';

      return students.find((student) => student.loginId === loginCode) || null;
    },
    activeCourse() {
      const courses = (this.dashboardSnapshot?.courses || []).filter((course) => course.entityType !== 'task');

      return courses.find((course) => course.isActive) || null;
    },
    questions() {
      if (!this.activeCourse) {
        return [];
      }

      if (this.resolvedAssessmentType === 'pre') {
        return this.activeCourse.preQuestions || [];
      }

      if (this.resolvedAssessmentType === 'tasks') {
        return this.activeCourse.taskQuestions || [];
      }

      return this.activeCourse.postQuestions || [];
    },
    isAssessmentEnabled() {
      if (!this.activeCourse) {
        return false;
      }

      const branchId = this.student?.branchId;
      const branchAvailability = branchId ? this.activeCourse.branchAvailability?.[branchId] || {} : {};
      const isEnabledBySettings = this.resolvedAssessmentType === 'pre'
        ? Boolean(this.activeCourse.isPreEnabled && (branchId ? branchAvailability.pre !== false : true))
        : this.resolvedAssessmentType === 'tasks'
          ? Boolean(this.activeCourse.isTasksEnabled && (branchId ? branchAvailability.tasks !== false : true))
          : Boolean(this.activeCourse.isPostEnabled && (branchId ? branchAvailability.post !== false : true));

      if (!isEnabledBySettings) {
        return false;
      }

      const branchWindow = branchId ? this.getWindowMeta(this.activeCourse.assessmentWindows?.[branchId]?.[this.resolvedAssessmentType]) : null;
      const globalWindow = this.getWindowMeta(this.activeCourse.assessmentWindows?.global?.[this.resolvedAssessmentType]);
      const hasWindowConfig = Boolean(branchWindow?.closesAt || globalWindow.closesAt);

      if (!hasWindowConfig) {
        return true;
      }

      return this.isWindowActive(branchWindow) || this.isWindowActive(globalWindow);
    },
    existingSubmission() {
      if (!this.activeCourse || !this.student) {
        return null;
      }

      return [...(this.dashboardSnapshot?.submissions || [])]
        .filter((submission) => (
          submission.courseId === this.activeCourse.id
          && submission.assessmentType === this.resolvedAssessmentType
          && submission.loginId === this.student.loginId
        ))
        .sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime())[0] || null;
    },
    satisfactionQuestions() {
      if (!this.activeCourse) {
        return [];
      }

      return [...(this.dashboardSnapshot?.satisfactionQuestions || [])]
        .filter((question) => question.courseId === this.activeCourse.id)
        .sort((left, right) => left.sortOrder - right.sortOrder);
    },
    alreadySubmittedSatisfaction() {
      if (!this.activeCourse || !this.student || this.satisfactionQuestions.length === 0) {
        return false;
      }

      const responses = this.dashboardSnapshot?.satisfactionResponses || [];

      return this.satisfactionQuestions.every((question) => responses.some((response) => (
        response.courseId === this.activeCourse.id
        && response.questionId === question.id
        && response.loginCode === this.student.loginId
      )));
    },
    hasPendingPostSatisfaction() {
      return this.resolvedAssessmentType === 'post'
        && this.satisfactionQuestions.length > 0
        && !this.alreadySubmittedSatisfaction;
    },
    canInteractWithAssessment() {
      return Boolean(this.student && this.isAssessmentEnabled && !this.existingSubmission);
    },
    canSubmitFlow() {
      return Boolean(this.student && this.isAssessmentEnabled && (!this.existingSubmission || this.hasPendingPostSatisfaction));
    },
    previewKind() {
      const type = this.previewAttachment?.type || '';
      const dataUrl = this.previewAttachment?.dataUrl || '';

      if (type.startsWith('image/') || dataUrl.startsWith('data:image/')) {
        return 'image';
      }

      if (type === 'application/pdf' || dataUrl.startsWith('data:application/pdf')) {
        return 'pdf';
      }

      if (type.startsWith('video/') || dataUrl.startsWith('data:video/')) {
        return 'video';
      }

      return 'other';
    },
  },
  watch: {
    currentUser() {
      if (this.publicSnapshot) {
        this.restoreStudentSession();
      }
    },
  },
  created() {
    this.assessmentClockTimer = window.setInterval(() => {
      this.currentTimestamp = Date.now();
    }, 1000);

    this.loadPublicData();
    this.publicAutoRefreshTimer = window.setInterval(() => {
      this.refreshPublicSnapshotSilently();
    }, 2000);
  },
  beforeUnmount() {
    if (this.assessmentClockTimer) {
      window.clearInterval(this.assessmentClockTimer);
      this.assessmentClockTimer = null;
    }

    if (this.publicLoadingGuardTimer) {
      window.clearTimeout(this.publicLoadingGuardTimer);
      this.publicLoadingGuardTimer = null;
    }

    if (this.publicAutoRefreshTimer) {
      window.clearInterval(this.publicAutoRefreshTimer);
      this.publicAutoRefreshTimer = null;
    }
  },
  methods: courseMethods,
};
