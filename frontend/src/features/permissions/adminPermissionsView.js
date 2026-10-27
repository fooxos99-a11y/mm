import { mapState } from 'vuex';
import AccessHistoryPanel from '../../components/permissions/AccessHistoryPanel.vue';
import DashboardAccountsPanel from '../../components/dashboard/DashboardAccountsPanel.vue';
import { AppActionBar, AppButton, AppSettingsPanel, AppDialog, AppFilterField, AppSelect, DialogShell } from '../../components/ui';
import { DASHBOARD_ACCOUNT_ROLE_OPTIONS } from '../dashboardAccounts/accountModel.mjs';
import { fetchAccessHistory } from '../../services/permissionEditorApi';

export default {
  name: 'AdminPermissionsView',
  components: { AccessHistoryPanel, DashboardAccountsPanel, AppActionBar, AppButton, AppSettingsPanel, AppDialog, AppFilterField, AppSelect, DialogShell },
  props: { embedded: Boolean },
  data: () => ({ activeSection: 'supervision', accountRole: 'all', history: [], historyLoading: false,
    historyError: '', accountsBusy: false, accountsDirty: false, leaveDialog: false,
    sectionOptions: [{ value: 'supervision', label: 'الحسابات الإشرافية' }, { value: 'history', label: 'سجل التغييرات' }] }),
  computed: {
    ...mapState(['currentUser']),
    roleOptions() { return [{ value: 'all', label: 'جميع الأنواع' }, ...DASHBOARD_ACCOUNT_ROLE_OPTIONS]; },
  },
  watch: { '$route.query': { immediate: true, handler(query) {
    this.activeSection = (query.supervisionSection || query.permissionsSection) === 'history' ? 'history' : 'supervision';
    this.accountRole = ['all', 'admin', 'male_manager', 'female_manager'].includes(query.supervisionRole) ? query.supervisionRole : 'all';
    if (this.activeSection === 'history') this.loadHistory();
  } } },
  mounted() {
    this.removeGuard = this.$router.beforeEach(async to => {
      const ownPage = to.path === this.$route.path && (to.query.panel === 'permissions' || (to.query.panel === 'settings' && to.query.settingsItem === 'permissions'));
      return ownPage || await this.confirmDiscardChanges();
    });
    this.beforeUnload = event => { if (this.accountsDirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', this.beforeUnload);
  },
  beforeUnmount() { this.removeGuard?.(); this.discardResolve?.(false); window.removeEventListener('beforeunload', this.beforeUnload); },
  methods: {
    updateRoute() {
      const query = { ...this.$route.query, supervisionSection: this.activeSection, supervisionRole: this.accountRole };
      delete query.permissionsSection; delete query.permissionRole;
      this.$router.replace({ query });
    },
    setSection(section) { this.activeSection = section; this.updateRoute(); },
    setRole(role) { this.accountRole = role; this.updateRoute(); },
    async loadHistory() {
      if (this.historyLoading) return;
      this.historyLoading = true; this.historyError = '';
      try { this.history = await fetchAccessHistory(); }
      catch (error) { this.historyError = error?.response?.data?.message || 'تعذر تحميل سجل التغييرات.'; }
      finally { this.historyLoading = false; }
    },
    confirmDiscardChanges() {
      if (this.$refs.accounts?.submitting || this.$refs.accounts?.confirming) return Promise.resolve(false);
      if (!this.accountsDirty) return Promise.resolve(true);
      this.leaveDialog = true; return new Promise(resolve => { this.discardResolve = resolve; });
    },
    discardAndLeave() { this.$refs.accounts?.discardDraft(); this.accountsDirty = false; this.leaveDialog = false; this.discardResolve?.(true); this.discardResolve = null; },
    continueEditing() { this.leaveDialog = false; this.discardResolve?.(false); this.discardResolve = null; },
  },
};
