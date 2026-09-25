import { mapActions, mapState } from 'vuex';
import PermissionsMatrixPanel from '../../components/permissions/PermissionsMatrixPanel.vue';
import { AppButton } from '../../components/ui';
import AdminSupervisionView from '../../views/AdminSupervisionView.vue';
import { PERMISSION_GROUPS, PERMISSION_ROLES } from './permissionGroups';

export default {
  name: 'AdminPermissionsView',
  components: { AdminSupervisionView, AppButton, PermissionsMatrixPanel },
  props: { embedded: { type: Boolean, default: false } },
  data() {
    return {
      savingKey: '',
      selectedRole: 'male_manager',
      activeSection: 'permissions',
      roleCards: PERMISSION_ROLES,
      permissionGroups: PERMISSION_GROUPS,
    };
  },
  computed: {
    ...mapState(['dashboardSnapshot', 'dashboardError', 'currentUser']),
  },
  watch: {
    activeSection() {
      this.emitTopbarState();
    },
  },
  created() {
    this.emitTopbarState();
  },
  methods: {
    ...mapActions({ updateRolePermission: 'setRolePermission' }),
    emitTopbarState() {
      this.$emit('permissions-topbar-state', { isAdmin: false, activeSection: this.activeSection });
    },
    toggleTopbarSection() {
      if (this.currentUser?.role === 'admin') {
        this.activeSection = this.activeSection === 'supervision' ? 'permissions' : 'supervision';
      }
    },
    isPermissionEnabled(role, key) {
      return this.dashboardSnapshot?.rolePermissions?.[role]?.[key] === true;
    },
    async updatePermission({ role, key, enabled }) {
      this.savingKey = `${role}:${key}`;
      try {
        await this.updateRolePermission({ role, key, isEnabled: Boolean(enabled) });
        this.$toast.success('تم تحديث الصلاحية');
      } catch (error) {
        this.$toast.error(error?.response?.data?.message || 'تعذر تحديث الصلاحية');
      } finally {
        this.savingKey = '';
      }
    },
  },
};
