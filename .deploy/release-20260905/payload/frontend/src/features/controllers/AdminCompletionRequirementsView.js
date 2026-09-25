import { mapState } from 'vuex';
import {
  AppButton, AppDialog, AppDialogBody, AppDialogFooter, AppDialogHeader, AppSelect, AppTextField,
} from '../../components/ui';
import {
  closeCompletionResults,
  fetchCompletionRequirements,
  reopenCompletionResults,
  updateCompletionRequirements,
} from '../../services/api';
import CompletionRequirementsPanel from '../../components/completion/CompletionRequirementsPanel.vue';

const emptyPayload = () => ({
  branchCode: 'male',
  branchLabel: 'معلمين',
  settings: {
    attendanceRequired: 10,
    tasksPercentageRequired: 80,
    finalExamPercentageRequired: 70,
    quranPartsRequired: 30,
    isClosed: false,
    closedAt: null,
  },
  summary: { total: 0, passed: 0, inProgress: 0, failed: 0 },
  students: [],
});

export default {
  name: 'AdminCompletionRequirementsView',
  components: {
    AppButton, AppDialog, AppDialogBody, AppDialogFooter, AppDialogHeader, AppSelect, AppTextField,
    CompletionRequirementsPanel,
  },
  data() {
    return {
      loading: false,
      saving: false,
      closing: false,
      settingsDialogOpen: false,
      closeDialogOpen: false,
      selectedBranch: 'male',
      statusFilter: 'all',
      selectedStudentId: '',
      payload: emptyPayload(),
      settingsDraft: {},
      branchOptions: [
        { label: 'معلمين', value: 'male' },
        { label: 'معلمات', value: 'female' },
      ],
      statusOptions: [
        { label: 'الجميع', value: 'all' },
        { label: 'مجتاز', value: 'passed' },
        { label: 'قيد الاستكمال', value: 'in_progress' },
        { label: 'غير مجتاز', value: 'failed' },
      ],
    };
  },
  computed: {
    ...mapState(['currentUser', 'dashboardSnapshot']),
    isAdmin() {
      return this.currentUser?.role === 'admin';
    },
    managerPermissions() {
      return this.dashboardSnapshot?.rolePermissions?.[this.currentUser?.role] || {};
    },
    canEditSettings() {
      return this.isAdmin || this.managerPermissions.edit_completion_requirements === true;
    },
    canCloseResults() {
      return this.isAdmin || this.managerPermissions.close_completion_results === true;
    },
    completionTopbarState() {
      return {
        canEditSettings: this.canEditSettings,
        canCloseResults: this.canCloseResults,
        isClosed: this.payload.settings.isClosed,
      };
    },
    filteredStudents() {
      return (this.payload.students || []).filter((student) => this.statusFilter === 'all' || student.status === this.statusFilter);
    },
    studentOptions() {
      return this.filteredStudents.map((student) => ({ label: student.name, value: student.id }));
    },
    selectedStudent() {
      return (this.payload.students || []).find((student) => student.id === this.selectedStudentId) || null;
    },
    closingFailureCount() {
      return Math.max(0, this.payload.summary.total - this.payload.summary.passed);
    },
  },
  watch: {
    completionTopbarState: {
      immediate: true,
      deep: true,
      handler(value) {
        this.$emit('completion-topbar-state', value);
      },
    },
    statusFilter() {
      if (!this.filteredStudents.some((student) => student.id === this.selectedStudentId)) {
        this.selectedStudentId = this.filteredStudents[0]?.id || '';
      }
    },
  },
  created() {
    if (this.currentUser?.role === 'female_manager') {
      this.selectedBranch = 'female';
    }
    this.loadRequirements();
  },
  methods: {
    statusLabel(status) {
      return { passed: 'مجتاز', in_progress: 'قيد الاستكمال', failed: 'غير مجتاز' }[status] || status;
    },
    syncSettingsDraft() {
      this.settingsDraft = { ...this.payload.settings };
    },
    async loadRequirements() {
      this.loading = true;
      try {
        this.payload = await fetchCompletionRequirements(this.selectedBranch);
        this.syncSettingsDraft();
        this.selectedStudentId = this.filteredStudents[0]?.id || '';
      } catch (error) {
        this.$toast.error(error?.response?.data?.message || 'تعذر تحميل متطلبات الاجتياز');
      } finally {
        this.loading = false;
      }
    },
    async saveSettings() {
      this.saving = true;
      try {
        this.payload = await updateCompletionRequirements(this.selectedBranch, this.settingsDraft);
        this.syncSettingsDraft();
        this.settingsDialogOpen = false;
        this.$toast.success('تم حفظ متطلبات الاجتياز');
      } catch (error) {
        this.$toast.error(error?.response?.data?.message || 'تعذر حفظ المتطلبات');
      } finally {
        this.saving = false;
      }
    },
    openSettingsDialog() {
      if (!this.canEditSettings) {
        return;
      }

      this.syncSettingsDraft();
      this.settingsDialogOpen = true;
    },
    openRequirementsDialog() {
      this.openSettingsDialog();
    },
    openCloseDialog() {
      if (!this.canCloseResults) {
        return;
      }

      this.closeDialogOpen = true;
    },
    async toggleResultsState() {
      this.closing = true;
      try {
        this.payload = this.payload.settings.isClosed
          ? await reopenCompletionResults(this.selectedBranch)
          : await closeCompletionResults(this.selectedBranch);
        this.syncSettingsDraft();
        this.closeDialogOpen = false;
        this.statusFilter = 'all';
        this.selectedStudentId = this.payload.students[0]?.id || '';
        this.$toast.success(this.payload.settings.isClosed ? 'تم إغلاق واعتماد النتائج' : 'تمت إعادة فتح النتائج');
      } catch (error) {
        this.$toast.error(error?.response?.data?.message || 'تعذر تحديث حالة النتائج');
      } finally {
        this.closing = false;
      }
    },
  },
};
