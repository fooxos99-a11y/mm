import { AppActionBar, AppButton, AppFilterField, AppFilterToolbar, AppPagination, AppSelect, AppTable } from '../../components/ui';
import DashboardAccountEditor from '../../components/dashboard/DashboardAccountEditor.vue';
import DashboardAccountConfirmation from '../../components/dashboard/DashboardAccountConfirmation.vue';
import { fetchDashboardAccounts, createDashboardAccount, updateDashboardAccount, deleteDashboardAccount } from '../../services/dashboardAccountsApi';
import { createEmptyDashboardAccountForm, DASHBOARD_ACCOUNT_ROLE_OPTIONS, resolveDashboardAccountRoleLabel } from './accountModel.mjs';
import { accountEditorChanged, accountEditorErrors } from './accountEditorModel.mjs';
import { accessDate } from '../permissions/accessHistoryFormat.mjs';

const empty = () => ({ ...createEmptyDashboardAccountForm(), isActive: true });
export default {
  name: 'DashboardAccountsPanel',
  components: { DashboardAccountConfirmation, DashboardAccountEditor, AppActionBar, AppButton, AppFilterField, AppFilterToolbar, AppPagination, AppSelect, AppTable },
  props: { active: { type: Boolean, default: true }, embedded: Boolean, externalFilters: Boolean, roleFilter: { type: String, default: 'all' } },
  emits: ['busy-change', 'dirty-change', 'changed'],
  data: () => ({ accounts: [], loaded: false, loading: false, loadError: '', submitting: false, editorOpen: false,
    editingAccount: null, form: empty(), baseline: empty(), formErrors: {}, formError: '',
    confirmation: '', confirmingAccount: null, confirmationError: '', confirming: false,
    page: 1, localRole: 'all', sort: 'newest',
    columns: [{ key: 'name', label: 'الحساب' }, { key: 'role', label: 'نوع المسؤول' }, { key: 'status', label: 'الحالة' }, { key: 'activity', label: 'النشاط' }, { key: 'actions', label: 'الإجراءات' }],
    sortOptions: [{ value: 'newest', label: 'الأحدث أولًا' }, { value: 'oldest', label: 'الأقدم أولًا' }, { value: 'name', label: 'الاسم' }] }),
  computed: {
    busy() { return this.loading || this.submitting || this.confirming; },
    roles() { return DASHBOARD_ACCOUNT_ROLE_OPTIONS; },
    roleOptions() { return [{ value: 'all', label: 'جميع الأنواع' }, ...this.roles]; },
    changed() { return accountEditorChanged(this.form, this.baseline); },
    valid() { return Object.keys(accountEditorErrors(this.form, Boolean(this.editingAccount))).length === 0; },
    dirty() { return this.editorOpen && this.changed; },
    filterSignature() { return [this.roleFilter, this.localRole, this.sort].join('|'); },
    filtered() {
      const role = this.externalFilters ? this.roleFilter : this.localRole;
      return this.accounts.filter(account => role === 'all' || account.role === role)
        .sort((a, b) => this.sort === 'name' ? a.name.localeCompare(b.name, 'ar') : (this.sort === 'oldest' ? 1 : -1) * String(a.createdAt || '').localeCompare(b.createdAt || ''));
    },
    pageCount() { return Math.max(1, Math.ceil(this.filtered.length / 10)); },
    pagedAccounts() { return this.filtered.slice((this.page - 1) * 10, this.page * 10); },
  },
  watch: {
    active: { immediate: true, handler(value) { if (value && !this.loaded && !this.loading) this.loadAccounts(); } },
    busy: { immediate: true, handler(value) { this.$emit('busy-change', value); } },
    dirty: { immediate: true, handler(value) { this.$emit('dirty-change', value); } },
    filterSignature() { this.page = 1; }, pageCount(value) { this.page = Math.min(value, this.page); },
  },
  methods: {
    accessDate, roleLabel(role) { return this.roles.find(item => item.value === role)?.label || resolveDashboardAccountRoleLabel(role); },
    async loadAccounts() {
      if (this.loading) return;
      this.loading = true; this.loadError = '';
      try { this.accounts = await fetchDashboardAccounts(); this.loaded = true; }
      catch (error) { this.loadError = error?.response?.data?.message || 'تعذر تحميل الحسابات. أعد المحاولة.'; }
      finally { this.loading = false; }
    },
    openCreateDialog() { if (this.busy) return; this.editingAccount = null; this.form = empty(); this.baseline = empty(); this.formErrors = {}; this.formError = ''; this.editorOpen = true; },
    openEditDialog(account) { if (this.busy) return; this.editingAccount = account; this.form = { name: account.name, loginCode: account.loginCode, role: account.role, isActive: account.isActive, password: '' }; this.baseline = { ...this.form }; this.formErrors = {}; this.formError = ''; this.editorOpen = true; },
    updateForm({ key, value }) { this.form[key] = value; this.formErrors[key] = ''; this.formError = ''; },
    requestClose() { if (this.submitting) return; if (this.changed) this.confirmation = 'discard'; else this.discardDraft(); },
    discardDraft() { this.editorOpen = false; this.form = empty(); this.baseline = empty(); this.confirmation = ''; this.formError = ''; },
    requestAction(account, action) { if (this.busy || account.isProtected || action !== 'delete') return; this.confirmingAccount = account; this.confirmation = action; this.confirmationError = ''; },
    replaceAccount(account) { this.accounts = this.accounts.some(item => item.id === account.id) ? this.accounts.map(item => item.id === account.id ? account : item) : [account, ...this.accounts]; this.$emit('changed'); },
    async submitAccount() {
      if (this.submitting || !this.valid || !this.changed) return;
      this.submitting = true; this.formErrors = {}; this.formError = '';
      try {
        const payload = { ...this.form };
        if (!payload.password) delete payload.password;
        const account = this.editingAccount ? await updateDashboardAccount(this.editingAccount.id, { ...payload, revision: this.editingAccount.revision }) : await createDashboardAccount(payload);
        this.replaceAccount(account); this.editorOpen = false; this.baseline = { ...this.form, password: '' }; this.form.password = '';
        this.$toast.success(this.editingAccount ? 'حُفظ الحساب' : 'أُضيف الحساب الإشرافي');
      } catch (error) {
        this.formErrors = Object.fromEntries(Object.entries(error?.response?.data?.errors || {}).map(([key, messages]) => [key === 'login_code' ? 'loginCode' : key, messages[0]]));
        this.formError = error?.response?.data?.message || 'تعذر حفظ الحساب. بقيت بياناتك لإعادة المحاولة.';
        if (error?.response?.status === 409) await this.loadAccounts();
      } finally { this.submitting = false; }
    },
    async confirmAction() {
      if (this.confirmation === 'discard') { this.discardDraft(); return; }
      if (this.confirming || !this.confirmingAccount) return;
      this.confirming = true; this.confirmationError = '';
      const account = this.confirmingAccount;
      try {
        if (this.confirmation === 'delete') { await deleteDashboardAccount(account.id); this.accounts = this.accounts.filter(item => item.id !== account.id); this.$emit('changed'); }
        this.$toast.success('حُذف الحساب'); this.confirmation = ''; this.confirmingAccount = null;
      } catch (error) {
        this.confirmationError = error?.response?.data?.message || 'تعذر تنفيذ الإجراء. أعد المحاولة.';
        if (error?.response?.status === 409) await this.loadAccounts();
      }
      finally { this.confirming = false; }
    },
  },
};
