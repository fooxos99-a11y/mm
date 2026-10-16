<template>
  <aside
    v-if="user?.departmentName"
    class="department-context"
    :class="{ 'department-context--workspace': ['dashboard', 'student', 'trainee', 'reciter'].includes($route.name) }"
    dir="rtl"
    aria-label="الإدارة الحالية"
  >
    <div><strong>{{ user.departmentName }}</strong><span v-if="user.roleLabel"> · {{ user.roleLabel }}</span></div>
    <AppButton
      v-if="isSystemAdministrator(user)"
      variant="secondary"
      :loading="loading"
      @click="returnToManagement"
    >
      إدارة النظام
    </AppButton>
  </aside>
</template>
<script>
import { AppButton } from '../ui';
import { isSystemAdministrator } from '../../features/departments/departmentModel.mjs';
export default {
  name: 'DepartmentContextBar', components: { AppButton }, props: { user: { type: Object, default: null } }, data: () => ({ loading: false }),
  methods: {
    isSystemAdministrator,
    async returnToManagement() {
      this.loading = true;
      try { await this.$store.dispatch('selectDepartmentContext', null); await this.$router.push({ name: 'system-management' }); }
      catch (error) { this.$toast.error(error?.response?.data?.message || 'تعذر العودة إلى إدارة النظام.'); }
      finally { this.loading = false; }
    },
  },
};
</script>
<style scoped>
.department-context { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--app-space-3); padding: var(--app-space-3) var(--app-space-4); background: var(--app-surface, #fff); border-block-end: 1px solid var(--app-border, #dde5eb); overflow-wrap: anywhere; }
@media (min-width: 1025px) { .department-context--workspace { margin-inline-start: 336px; } }
</style>
