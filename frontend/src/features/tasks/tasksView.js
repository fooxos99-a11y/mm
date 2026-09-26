import { defineAsyncComponent } from 'vue';
import AttachmentPreviewDialog from '../../components/tasks/AttachmentPreviewDialog.vue';
import { AppButton, AppChoiceButton } from '../../components/ui';
import taskMethods from './tasksViewMethods';
const RichTextEditor = defineAsyncComponent(() => import(
  /* webpackChunkName: "rich-text-editor" */ '@/components/RichTextEditor.vue'
));

export default {
  name: 'TasksView',
  components: {
    AttachmentPreviewDialog,
    AppButton,
    AppChoiceButton,
    RichTextEditor,
  },
  data() {
    return {
      publicSnapshot: null,
      publicLoading: false,
      publicError: '',
      studentLoginId: '',
      studentResolved: false,
      selectedTaskId: '',
      answers: {},
      files: {},
      pageError: '',
      submitting: false,
      previewDialogOpen: false,
      previewAttachment: null,
      currentTimestamp: Date.now(),
      taskClockTimer: null,
      publicLoadingGuardTimer: null,
    };
  },
  computed: {
    currentUser() {
      return this.$store?.state?.currentUser || null;
    },
    isAuthenticatedNonStudent() {
      return Boolean(this.currentUser?.role && !['student', 'trainee'].includes(this.currentUser.role));
    },
    authenticatedStudentLogin() {
      return ['student', 'trainee'].includes(this.currentUser?.role)
        ? String(this.currentUser.loginCode || '').trim()
        : '';
    },
    tasks() {
      return [...(this.publicSnapshot?.courses || [])]
        .filter((course) => course.entityType === 'task')
        .sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0));
    },
    selectedTask() {
      return this.tasks.find((task) => task.id === this.selectedTaskId) || this.tasks[0] || null;
    },
    taskQuestions() {
      return this.selectedTask?.taskQuestions || [];
    },
    documentQuestion() {
      return this.taskQuestions.find((question) => question.allowFile) || this.taskQuestions[0] || null;
    },
    selectedTaskSummary() {
      return typeof this.selectedTask?.taskDescription === 'string'
        ? this.selectedTask.taskDescription.trim()
        : '';
    },
    selectedTaskTemplateContent() {
      return typeof this.selectedTask?.taskTemplateContent === 'string'
        ? this.selectedTask.taskTemplateContent
        : '';
    },
    documentInitialContent() {
      if (!this.documentQuestion) {
        return '';
      }

      const submittedAnswer = (this.existingSubmission?.answers || []).find(
        (answer) => answer.questionId === this.documentQuestion.id,
      );

      if (typeof submittedAnswer?.value === 'string' && submittedAnswer.value.trim()) {
        return submittedAnswer.value;
      }

      return this.selectedTaskTemplateContent;
    },
    documentAnswer() {
      if (!this.documentQuestion) {
        return '';
      }

      return Object.hasOwn(this.answers, this.documentQuestion.id)
        ? this.answers[this.documentQuestion.id]
        : this.documentInitialContent;
    },
    currentTaskVideo() {
      return this.resolveTaskVideo(this.selectedTask?.youtubeUrl || '');
    },
    student() {
      return (this.publicSnapshot?.students || []).find((student) => student.loginId === this.studentLoginId) || null;
    },
    taskIsEnabled() {
      if (!this.selectedTask || !this.student) {
        return false;
      }

      const branchAvailability = this.selectedTask.branchAvailability?.[this.student.branchId] || {};

      if (!(this.selectedTask.isTasksEnabled && branchAvailability.tasks !== false)) {
        return false;
      }

      const branchWindow = this.getWindowMeta(this.selectedTask.assessmentWindows?.[this.student.branchId]?.tasks);
      const globalWindow = this.getWindowMeta(this.selectedTask.assessmentWindows?.global?.tasks);
      const hasWindowConfig = Boolean(branchWindow.closesAt || globalWindow.closesAt);

      if (!hasWindowConfig) {
        return true;
      }

      return this.isWindowActive(branchWindow) || this.isWindowActive(globalWindow);
    },
    existingSubmission() {
      if (!this.selectedTask || !this.student) {
        return null;
      }

      return [...(this.publicSnapshot?.submissions || [])]
        .filter((submission) => submission.courseId === this.selectedTask.id && submission.assessmentType === 'tasks' && submission.loginId === this.student.loginId)
        .sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime())[0] || null;
    },
    canSubmit() {
      return Boolean(this.selectedTask && this.student && this.taskIsEnabled && !this.existingSubmission);
    },
    previewKind() {
      const type = this.previewAttachment?.type || '';
      const source = this.previewAttachmentSource;

      if (type.startsWith('image/') || source.startsWith('data:image/')) {
        return 'image';
      }

      if (type === 'application/pdf' || source.startsWith('data:application/pdf')) {
        return 'pdf';
      }

      if (type.startsWith('video/') || source.startsWith('data:video/')) {
        return 'video';
      }

      return 'other';
    },
    previewAttachmentSource() {
      return this.previewAttachment?.previewUrl || this.previewAttachment?.dataUrl || '';
    },
  },
  watch: {
    currentUser() {
      if (this.redirectAuthenticatedNonStudent()) {
        return;
      }

      if (this.publicSnapshot) {
        this.restoreStudentSession();
      }
    },
    tasks: {
      immediate: true,
      handler(tasks) {
        if (!tasks.length) {
          this.selectedTaskId = '';
          return;
        }

        const requestedTaskId = typeof this.$route.query.taskId === 'string' ? this.$route.query.taskId.trim() : '';

        if (requestedTaskId && tasks.some((task) => task.id === requestedTaskId)) {
          this.selectedTaskId = requestedTaskId;
          return;
        }

        if (!tasks.some((task) => task.id === this.selectedTaskId)) {
          this.selectedTaskId = tasks[0].id;
        }
      },
    },
    selectedTaskId: {
      immediate: true,
      handler(taskId) {
        this.clearSelectedFiles();

        if (!taskId) {
          this.answers = {};
          this.files = {};
          return;
        }

        this.answers = {};

        this.files = {};
      },
    },
  },
  created() {
    if (this.redirectAuthenticatedNonStudent()) {
      return;
    }

    this.taskClockTimer = window.setInterval(() => {
      this.currentTimestamp = Date.now();
    }, 1000);

    this.loadPublicData();
  },
  beforeUnmount() {
    if (this.taskClockTimer) {
      window.clearInterval(this.taskClockTimer);
      this.taskClockTimer = null;
    }

    if (this.publicLoadingGuardTimer) {
      window.clearTimeout(this.publicLoadingGuardTimer);
      this.publicLoadingGuardTimer = null;
    }

    this.clearSelectedFiles();
  },
  methods: taskMethods,
};
