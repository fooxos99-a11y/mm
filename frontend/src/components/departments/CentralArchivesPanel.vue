<template>
  <AppCard class="admin-workspace-card central-archives">
    <div class="central-archives__heading">
      <h2>الأرشيف المركزي</h2>
    </div>
    <AppFilterToolbar
      :columns="3"
      class="central-archives__filters"
    >
      <AppFilterField
        for-id="management-record-department"
        label="الإدارة"
      >
        <AppSelect
          id="management-record-department"
          v-model="departmentId"
          aria-labelledby="management-record-department-label"
          :items="departmentOptions"
          item-text="label"
          item-value="value"
          hide-details
          @update:model-value="resetRecords"
        />
      </AppFilterField>
      <AppFilterField
        for-id="management-record-batch"
        label="الدفعة"
      >
        <AppSelect
          id="management-record-batch"
          v-model="batch"
          aria-labelledby="management-record-batch-label"
          :items="archiveOptions"
          item-text="label"
          item-value="value"
          hide-details
          @update:model-value="resetRecords"
        />
      </AppFilterField>
      <form
        class="central-archives__search"
        @submit.prevent="search"
      >
        <AppInput
          v-model.trim="name"
          label="الاسم أو رقم الدخول"
          type="search"
          maxlength="255"
        />
        <AppButton
          native-type="submit"
          variant="secondary"
          :loading="loading"
        >
          بحث
        </AppButton>
      </form>
    </AppFilterToolbar>
    <p
      v-if="catalogError"
      role="alert"
      class="central-archives__notice"
    >
      {{ catalogError }} <AppButton
        variant="plain"
        @click="loadArchives"
      >
        إعادة المحاولة
      </AppButton>
    </p>
    <div
      class="central-archives__summary"
      role="status"
    >
      {{ loading ? 'جارٍ تحميل السجلات...' : pagination.total + ' سجل · ' + batchLabel }}
    </div>
    <AppErrorState
      v-if="error"
      :message="error"
      @retry="loadRecords"
    />
    <AppTable
      v-else
      :items="students"
      :columns="columns"
      :loading="loading"
      empty-title="لا توجد سجلات لهذه التصفية"
      empty-description="غيّر الإدارة أو الدفعة أو كلمة البحث."
    >
      <template #cell-name="{ item }">
        <strong>{{ item.full_name }}</strong>
      </template>
      <template #cell-login_code="{ item }">
        <bdi>{{ item.login_code }}</bdi>
      </template>
      <template #cell-archive="{ item }">
        <span
          class="central-archives__batch"
          :class="{ 'is-current': !item.archive_id }"
        >{{ item.archive_name || 'الدفعة الحالية' }}</span>
      </template>
      <template #cell-actions="{ item }">
        <AppButton
          variant="secondary"
          :aria-label="'عرض سجل ' + item.full_name"
          @click="openStudent(item)"
        >
          عرض السجل
        </AppButton>
      </template>
    </AppTable>
    <AppPagination
      :model-value="page"
      :page-count="pagination.lastPage"
      @update:model-value="changePage"
    />
    <ArchivedStudentDetailDialog
      :value="detailOpen"
      :loading="detailLoading"
      :detail="detail"
      :completion-status="completionStatusLabel(detail?.student?.completionResult?.status)"
      :completion-rows="completionRequirementRows(detail?.student?.completionResult?.details)"
      :registration-rows="registrationProfileRows(detail?.student?.registrationProfile)"
      :stats="buildArchivedStudentStats(detail)"
      :format-score="formatScore"
      :format-date-time="formatDateTime"
      @input="detailOpen = $event"
      @close="detailOpen = false"
    />
  </AppCard>
</template>
<script>
import { AppButton, AppCard, AppErrorState, AppFilterField, AppFilterToolbar, AppInput, AppPagination, AppSelect, AppTable } from '../ui';
import ArchivedStudentDetailDialog from '../archive/ArchivedStudentDetailDialog.vue';
import presentation from '../../features/archive/archivePresentation';
import { fetchManagementArchives, fetchManagementRecords, fetchManagementArchivedStudent, fetchManagementCurrentStudent } from '../../services/managementApi';
export default {
  name: 'CentralArchivesPanel',
  components: { AppButton, AppCard, AppErrorState, AppFilterField, AppFilterToolbar, AppInput, AppPagination, AppSelect, AppTable, ArchivedStudentDetailDialog },
  props: { departments: { type: Array, default: () => [] } },
  data: () => ({
    departmentId: '', batch: 'current', archives: [], students: [], name: '', appliedSearch: '', page: 1,
    pagination: { total: 0, lastPage: 1 }, error: '', catalogError: '', loading: false,
    detail: null, detailOpen: false, detailLoading: false, requestGeneration: 0, detailGeneration: 0,
    columns: [{ key: 'name', label: 'الاسم' }, { key: 'login_code', label: 'رقم الدخول' }, { key: 'departmentName', label: 'الإدارة' }, { key: 'branchName', label: 'الفرع' }, { key: 'archive', label: 'الدفعة' }, { key: 'actions', label: 'السجل' }],
  }),
  computed: {
    departmentOptions() { return [{ label: 'جميع الإدارات', value: '' }, ...this.departments.map(d => ({ label: d.name, value: d.id }))]; },
    archiveOptions() { return [{ label: 'الدفعة الحالية', value: 'current' }, { label: 'جميع الدفعات', value: 'all' }, { label: 'الدفعات المؤرشفة', value: 'archived' }, ...this.archives.map(a => ({ label: a.name + ' · ' + (a.departmentName || ''), value: a.id }))]; },
    batchLabel() { return this.archiveOptions.find(a => a.value === this.batch)?.label || ''; },
  },
  created() { this.loadArchives(); this.loadRecords(); },
  beforeUnmount() { this.requestGeneration += 1; this.detailGeneration += 1; },
  methods: {
    ...presentation,
    async loadArchives() {
      this.catalogError = '';
      try { const payload = await fetchManagementArchives(); this.archives = payload?.archives || []; }
      catch { this.catalogError = 'تعذر تحميل قائمة الدفعات السابقة.'; }
    },
    resetRecords() { this.page = 1; this.loadRecords(); },
    search() { this.appliedSearch = this.name; this.resetRecords(); },
    changePage(page) { if (!this.loading) { this.page = page; this.loadRecords(); } },
    async loadRecords() {
      const generation = ++this.requestGeneration;
      this.detailGeneration += 1; this.detailLoading = false; this.detailOpen = false;
      this.loading = true; this.error = ''; this.students = [];
      const namedBatch = ['current', 'all', 'archived'].includes(this.batch);
      const params = { batch: namedBatch ? this.batch : 'archived', page: this.page };
      if (!namedBatch) params.archiveId = this.batch;
      if (this.departmentId) params.departmentId = this.departmentId;
      if (this.appliedSearch) params.search = this.appliedSearch;
      try {
        const payload = await fetchManagementRecords(params);
        if (generation !== this.requestGeneration) return;
        this.students = payload?.students || [];
        this.pagination = payload?.pagination || { total: this.students.length, lastPage: 1 };
        this.page = this.pagination.page || this.page;
      } catch (error) { if (generation === this.requestGeneration) this.error = error?.response?.data?.message || 'تعذر تحميل السجلات.'; }
      finally { if (generation === this.requestGeneration) this.loading = false; }
    },
    async openStudent(student) {
      if (this.detailLoading) return;
      const generation = ++this.detailGeneration;
      this.detail = null; this.detailOpen = true; this.detailLoading = true;
      try {
        const detail = student.archive_id ? await fetchManagementArchivedStudent(student.archive_id, student.id) : await fetchManagementCurrentStudent(student.id);
        if (generation === this.detailGeneration) this.detail = detail;
      } catch (error) {
        if (generation === this.detailGeneration) { this.detailOpen = false; this.$toast.error(error?.response?.data?.message || 'تعذر تحميل سجل المعلم.'); }
      } finally { if (generation === this.detailGeneration) this.detailLoading = false; }
    },
  },
};
</script>
<style scoped>
.central-archives__heading { margin-bottom: var(--app-space-6); padding-bottom: var(--app-space-4); border-bottom: 1px solid var(--app-border); }
.central-archives__heading h2 { margin: 0; color: var(--app-ui-text); font-size: var(--app-font-sm); font-weight: var(--app-weight-label); line-height: 1.5; }
.central-archives__search { display: grid; min-width: 0; gap: var(--app-space-3); align-items: end; }
.central-archives__summary { padding-bottom: var(--app-space-4); color: var(--app-text-muted); font-size: var(--app-font-sm); }
.central-archives__batch { display: inline-block; border-radius: var(--app-radius-control); padding: 4px 9px; background: var(--app-primary-soft); color: var(--app-text-muted); font-size: var(--app-font-sm); }
.central-archives__batch.is-current { color: var(--app-primary); }
.central-archives__notice { color: var(--app-danger); }
@media (min-width: 768px) { .central-archives__filters { --app-filter-columns: 1fr 1fr 2fr; } .central-archives__search { grid-template-columns: minmax(0, 1fr) auto; } }
@media (max-width: 767px) { .central-archives__filters { --app-filter-columns: minmax(0, 1fr); } }
</style>
<style>
@import "../../styles/views/admin-archive.css";
@import "../../styles/views/admin-archive-dialogs.css";
</style>
