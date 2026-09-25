import AttachmentPreviewDialog from '../../components/tasks/AttachmentPreviewDialog.vue';
import FinalExamAttemptPanel from '../../components/finalExam/FinalExamAttemptPanel.vue';
import FinalExamReviewPanel from '../../components/finalExam/FinalExamReviewPanel.vue';
import computed from '../finalExam/publicFinalExamComputed';
import dataMethods from '../finalExam/publicFinalExamDataMethods';
import sessionMethods from '../finalExam/publicFinalExamSessionMethods';
import createState from '../finalExam/publicFinalExamState';
import submissionMethods from '../finalExam/publicFinalExamSubmissionMethods';

export default {
  name: 'FinalExamView',
  components: { AttachmentPreviewDialog, FinalExamAttemptPanel, FinalExamReviewPanel },
  data: createState,
  computed,
  watch: {
    currentUser() {
      if (this.publicSnapshot) this.restoreStudentSession();
    },
  },
  created() {
    this.clockIntervalId = window.setInterval(() => { this.currentTimestamp = Date.now(); }, 30000);
    this.loadPublicData();
    this.publicAutoRefreshTimer = window.setInterval(() => { this.refreshPublicSnapshotSilently(); }, 2000);
  },
  beforeUnmount() {
    if (this.clockIntervalId) window.clearInterval(this.clockIntervalId);
    if (this.publicLoadingGuardTimer) window.clearTimeout(this.publicLoadingGuardTimer);
    if (this.publicAutoRefreshTimer) window.clearInterval(this.publicAutoRefreshTimer);
    this.clockIntervalId = null;
    this.publicLoadingGuardTimer = null;
    this.publicAutoRefreshTimer = null;
  },
  methods: { ...dataMethods, ...sessionMethods, ...submissionMethods },
};
