import { mapActions, mapState } from 'vuex';
import PeopleDirectoryPanel from '../../components/people/PeopleDirectoryPanel.vue';
import PeopleEditorDialog from '../../components/people/PeopleEditorDialog.vue';
import PeopleManagementDialogs from '../../components/people/PeopleManagementDialogs.vue';
import {
  createEmptyReciterForm as emptyReciterForm,
  createEmptyStudentForm as emptyStudentForm,
} from './peopleModel.mjs';
import computed from './adminPeopleComputed';
import bulkImportMethods from './peopleBulkImportMethods';
import managementMethods from './peopleManagementMethods';
import studentMethods from './peopleStudentMethods';
import submitMethods from './peopleSubmitMethods';
import directoryMethods from './peopleDirectoryMethods';
import dialogDataMethods from './peopleDialogDataMethods';

export default {
  name: 'AdminPeopleView',
  components: {
    PeopleDirectoryPanel,
    PeopleEditorDialog,
    PeopleManagementDialogs,
  },
  props: { embedded: { type: Boolean, default: false } },
  data() {
    return {
      dialogDataLoading: false,
      dialogDataError: '',
      personRecords: { student: {}, reciter: {} },
      directoryRows: [], directorySearch: '', directoryPage: 1, directoryPages: 1, directoryTotal: 0,
      directoryLoading: false, directoryError: '', directoryGeneration: 0,
      directoryController: null, directorySearchTimer: null,
      selectedStudentId: '',
      selectedBranch: 'male',
      selectedFilter: 'all',
      activeToastId: null,
      activeToastTimer: null,
      partsDialogOpen: false,
      partsDialogStudentId: '',
      partsDialogSavingKey: '',
      partsDialogParts: [],
      reciterDialogOpen: false,
      reciterDialogStudentId: '',
      reciterDialogReciterId: '',
      reciterDialogSaving: false,
      deleteDialogOpen: false,
      deleteDialogSubmitting: false,
      deleteTarget: null,
      deleteTargetIsReciter: false,
      manageDialogOpen: false,
      manageEntityType: 'student',
      manageBranchId: 'male',
      manageTargetId: '',
      manageDialogSubmitting: false,
      dialogOpen: false,
      isEditing: false,
      isDirectCardEdit: false,
      editingBranchId: '',
      editingTargetId: '',
      dialogEntityType: 'student',
      studentForm: emptyStudentForm(),
      reciterForm: emptyReciterForm(),
      branchOptions: [
        { label: 'معلمين', value: 'male' },
        { label: 'معلمات', value: 'female' },
      ],
      baseFilterOptions: [
        { label: 'الترتيب الأبجدي أ-ي', value: 'all' },
        { label: 'الأعلى إنجازًا', value: 'highest-progress' },
        { label: 'الأقل إنجازًا', value: 'lowest-progress' },
      ],
      bulkImporting: false,
      bulkFilePickerOpen: false,
      bulkFilePickerResetTimer: null,
      dialogErrors: [],
      dialogSubmitting: false,
    };
  },
  computed: { ...mapState(['currentUser', 'dashboardSnapshot', 'dashboardError']), ...computed },
  watch: {
    effectiveSelectedBranch() { this.refreshDirectory(); },
    selectedFilter() { this.refreshDirectory(); },
    dashboardSnapshot() { this.loadPeopleDirectory(); },
  },
  created() {
    if (this.managedBranchId) this.selectedBranch = this.managedBranchId;
    if (!this.dashboardSnapshot) this.ensureDashboardSnapshot({ mode: 'shell' });
    this.loadPeopleDirectory();
  },
  beforeUnmount() {
    this.directoryGeneration++;
    this.directoryController?.abort();
    if (this.directorySearchTimer) clearTimeout(this.directorySearchTimer);
    window.removeEventListener('focus', this.handleBulkFilePickerWindowFocus);
    if (this.bulkFilePickerResetTimer) window.clearTimeout(this.bulkFilePickerResetTimer);
    if (this.activeToastTimer) window.clearTimeout(this.activeToastTimer);
    if (this.activeToastId !== null && typeof this.$toast.dismiss === 'function') {
      this.$toast.dismiss(this.activeToastId);
    }
  },
  methods: {
    ...directoryMethods,
    ...mapActions([
      'refreshDashboardSnapshot', 'ensureDashboardSnapshot', 'addStudent', 'updateStudent', 'saveReciter',
      'deleteStudent', 'deleteReciter',
    ]),
    ...studentMethods,
    ...managementMethods,
    ...bulkImportMethods,
    ...submitMethods,
    ...dialogDataMethods,
  },
};
