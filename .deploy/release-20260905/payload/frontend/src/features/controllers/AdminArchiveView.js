import ArchivedStudentDetailDialog from '../../components/archive/ArchivedStudentDetailDialog.vue';
import ArchiveManagementDialogs from '../../components/archive/ArchiveManagementDialogs.vue';
import ArchiveRecordsPanel from '../../components/archive/ArchiveRecordsPanel.vue';
import computed from '../archive/archiveComputed';
import dataMethods from '../archive/archiveDataMethods';
import dialogMethods from '../archive/archiveDialogMethods';
import presentationMethods from '../archive/archivePresentation';

export default {
  name: 'AdminArchiveView',
  components: {
    ArchivedStudentDetailDialog,
    ArchiveManagementDialogs,
    ArchiveRecordsPanel,
  },
  props: {
    embedded: { type: Boolean, default: false },
  },
  data() {
    return {
      archives: [],
      selectedArchiveId: null,
      archiveData: null,
      loading: false,
      saving: false,
      deletingArchiveId: '',
      deleteArchiveDialog: false,
      pendingDeleteArchive: null,
      createDialog: false,
      newArchiveName: '',
      newArchiveCoursesCount: 0,
      newArchiveBatchType: 'all',
      archiveAllDialog: false,
      archiveAllName: '',
      archiveAllBatchType: 'all',
      addStudentDialog: false,
      manualStudentName: '',
      studentSearchQuery: '',
      searchDebounceId: null,
      searchLoading: false,
      searchPerformed: false,
      searchResults: [],
      selectedArchivedStudentId: '',
      selectedArchivedStudentDetail: null,
      detailDialogOpen: false,
      detailLoading: false,
      batchTypeOptions: [
        { label: 'معلمين', value: 'male' },
        { label: 'معلمات', value: 'female' },
        { label: 'الجميع', value: 'all' },
      ],
      studentHeaders: [
        { text: 'اسم الطالب', value: 'full_name' },
        { text: 'الدفعة', value: 'archive_name' },
        { text: 'رقم الدخول', value: 'login_code' },
        { text: 'الفرع', value: 'branch' },
        { text: 'تاريخ الإضافة', value: 'created_at' },
      ],
    };
  },
  computed,
  watch: {
    studentSearchQuery() {
      this.scheduleArchivedStudentSearch();
    },
  },
  created() {
    this.fetchArchives();
  },
  beforeUnmount() {
    if (this.searchDebounceId) clearTimeout(this.searchDebounceId);
  },
  methods: {
    ...presentationMethods,
    ...dialogMethods,
    ...dataMethods,
  },
};
