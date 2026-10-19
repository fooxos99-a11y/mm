import { mapState } from 'vuex';
import { AppActionBar, AppButton, AppCard, AppDialog, AppDialogBody, AppDialogFooter, AppDialogHeader, AppErrorState, AppFilterField, AppInput, AppLoadingSpinner, AppPasswordField, AppSelect, AppTable } from '../../components/ui';
import AppWorkspaceTopbar from '../../components/ui/AppWorkspaceTopbar.vue';
import DashboardSidebar from '../../components/dashboard/DashboardSidebar.vue';
import DashboardOverviewPanel from '../../components/dashboard/DashboardOverviewPanel.vue';
import CentralArchivesPanel from '../../components/departments/CentralArchivesPanel.vue';
import { useIndicatorAnimation } from '../../composables/useIndicatorAnimation';
import { fetchDepartments, fetchManagementOverview, saveDepartment } from '../../services/managementApi';
import { createDepartmentForm, departmentFormHasChanges, departmentFormIsValid, managementNavigation, managementSectionQuery, resolveManagementSection } from './departmentModel.mjs';
import { passwordMeetsPolicy } from '../../utils/passwordPolicy.mjs';

const totals = (values = {}) => [
  { key: 'departments', label: 'الإدارات', value: values.departments ?? 0 },
  { key: 'users', label: 'الحسابات', value: values.users ?? 0 },
  { key: 'students', label: 'المعلمون والمعلمات', value: values.students ?? 0 },
  { key: 'courses', label: 'الدورات', value: values.courses ?? 0 },
  { key: 'archives', label: 'الدفعات المؤرشفة', value: values.archives ?? 0 },
];

export default {
  name: 'SystemManagementView',
  components: { AppActionBar, AppButton, AppCard, AppDialog, AppDialogBody, AppDialogFooter, AppDialogHeader, AppErrorState, AppFilterField, AppInput, AppLoadingSpinner, AppPasswordField, AppSelect, AppTable, AppWorkspaceTopbar, DashboardSidebar, DashboardOverviewPanel, CentralArchivesPanel },
  setup: useIndicatorAnimation,
  data: () => ({
    menuOpen: false, navigation: managementNavigation, departments: [],
    loading: true, error: '', overview: {}, overviewLoading: false, overviewError: '',
    dialogOpen: false, editingId: null, form: createDepartmentForm(), originalForm: null,
    originalManagerLoginCode: '', saving: false, saveError: '', fieldErrors: {},
    entering: '', signingOut: false, overviewGeneration: 0, loadGeneration: 0,
    columns: [{ key: 'name', label: 'الإدارة' }, { key: 'manager', label: 'المسؤول' }, { key: 'status', label: 'الحالة' }, { key: 'actions', label: 'الإجراءات', width: '260px' }],
    statusOptions: [{ label: 'نشطة', value: true }, { label: 'موقوفة', value: false }],
  }),
  computed: {
    ...mapState(['currentUser']),
    activeSection() { return resolveManagementSection(this.$route.query.section); },
    totalCards() { return totals(this.overview?.totals); },
    overviewDepartmentId: {
      get() {
        const id = this.$route.query.departmentId;
        return this.activeSection === 'indicators' && this.departments.some(d => String(d.id) === id) ? id : '';
      },
      set(id) {
        const query = managementSectionQuery(this.$route.query, 'indicators');
        if (id) query.departmentId = id;
        else delete query.departmentId;
        this.$router.push({ query });
      },
    },
    selectedOverview() {
      return this.overviewDepartmentId ? this.overview?.departments?.find(d => String(d.id) === this.overviewDepartmentId) : this.overview;
    },
    overviewIndicators() { return this.selectedOverview?.indicators || []; },
    indicatorAnimationSignature() { return JSON.stringify([this.activeSection, this.overviewDepartmentId, this.overviewIndicators]); },
    filterOptions() { return [{ label: 'جميع الإدارات', value: '' }, ...this.departments.map(d => ({ label: d.name, value: d.id }))]; },
    needsManagerPassword() { return !this.originalManagerLoginCode || this.form.managerLoginCode.trim() !== this.originalManagerLoginCode; },
    managerPasswordError() {
      return this.fieldErrors.managerPassword || (this.form.managerPassword && !passwordMeetsPolicy(this.form.managerPassword) ? 'أدخل كلمة مرور صالحة.' : '');
    },
    canSaveDepartment() { return departmentFormIsValid(this.form, this.originalManagerLoginCode) && departmentFormHasChanges(this.form, this.originalForm); },
  },
  watch: {
    activeSection() {
      this.menuOpen = false;
      this.overviewGeneration += 1;
      this.overviewLoading = false;
      this.overviewError = '';
    },
    overviewDepartmentId() { if (!this.loading && this.activeSection === 'indicators') this.loadOverview(); },
    indicatorAnimationSignature: { immediate: true, handler() { this.$nextTick(() => this.restartIndicatorAnimation()); } },
  },
  created() { this.load(); },
  beforeUnmount() { this.overviewGeneration += 1; this.loadGeneration += 1; this.form.managerPassword = ''; },
  methods: {
    isActive(item) { return this.activeSection === item.id; },
    selectSection(item) { this.menuOpen = false; this.$router.push({ query: managementSectionQuery(this.$route.query, item.id || item) }); },
    async load() {
      const generation = ++this.loadGeneration;
      this.overviewGeneration += 1;
      this.loading = true; this.error = '';
      try {
        const [payload, overview] = await Promise.all([fetchDepartments(), fetchManagementOverview()]);
        if (generation !== this.loadGeneration) return;
        this.departments = payload?.departments || payload || [];
        this.overview = overview; this.overviewError = ''; this.overviewLoading = false;
      } catch (error) { if (generation === this.loadGeneration) this.error = error?.response?.data?.message || 'تعذر تحميل الإدارات. حاول مرة أخرى.'; }
      finally { if (generation === this.loadGeneration) this.loading = false; }
    },
    openDepartment(department) {
      if (this.saving) return;
      this.editingId = department?.id || null;
      this.form = createDepartmentForm(department); this.originalForm = { ...this.form };
      this.originalManagerLoginCode = department?.manager?.loginCode || '';
      this.saveError = ''; this.fieldErrors = {}; this.dialogOpen = true;
    },
    closeDepartment() { if (!this.saving) { this.dialogOpen = false; this.form.managerPassword = ''; } },
    async submitDepartment() {
      if (!this.canSaveDepartment || this.saving) return;
      this.saving = true; this.saveError = ''; this.fieldErrors = {};
      try {
        await saveDepartment(this.editingId, {
          ...this.form, name: this.form.name.trim(), managerTitle: this.form.managerTitle.trim(),
          managerLoginCode: this.form.managerLoginCode.trim(), managerPassword: this.needsManagerPassword ? this.form.managerPassword : undefined,
        });
        this.form.managerPassword = ''; this.dialogOpen = false;
        this.$toast.success('حُفظت الإدارة.'); await this.load();
        if (this.activeSection === 'overview') this.selectSection('departments');
      } catch (error) {
        this.saveError = error?.response?.data?.message || 'تعذر حفظ الإدارة.';
        this.fieldErrors = Object.fromEntries(Object.entries(error?.response?.data?.errors || {}).map(([key, value]) => [key, value[0]]));
      } finally { this.saving = false; }
    },
    async enterDepartment(department) {
      if (this.entering || department.isActive === false) return;
      this.entering = department.id;
      try { await this.$store.dispatch('selectDepartmentContext', department.id); await this.$router.push({ name: 'dashboard' }); }
      catch (error) { this.$toast.error(error?.response?.data?.message || 'تعذر فتح الإدارة.'); }
      finally { this.entering = ''; }
    },
    async loadOverview() {
      const generation = ++this.overviewGeneration;
      this.overviewLoading = true; this.overviewError = '';
      try { const overview = await fetchManagementOverview(this.overviewDepartmentId); if (generation === this.overviewGeneration) this.overview = overview; }
      catch (error) { if (generation === this.overviewGeneration) this.overviewError = error?.response?.data?.message || 'تعذر تحميل المؤشرات.'; }
      finally { if (generation === this.overviewGeneration) { this.overviewLoading = false; this.restartIndicatorAnimation(); } }
    },
    async signOut() {
      if (this.signingOut) return;
      this.signingOut = true;
      try { await this.$store.dispatch('logout'); await this.$router.replace({ name: 'login' }); }
      catch { this.$toast.error('تعذر تسجيل الخروج. حاول مرة أخرى.'); }
      finally { this.signingOut = false; }
    },
  },
};
