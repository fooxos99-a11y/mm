<template>
  <AppCard title="الأرشيف المركزي">
    <div class="central-archives__filters">
      <AppSelect
        v-model="departmentId"
        label="الإدارة"
        :items="departmentOptions"
        item-text="label"
        item-value="value"
        @update:model-value="loadArchives"
      />
      <AppSelect
        v-model="archiveId"
        label="الدفعة"
        :items="archiveOptions"
        item-text="label"
        item-value="value"
        @update:model-value="loadArchive"
      />
      <form
        class="central-archives__search"
        @submit.prevent="search"
      >
        <AppInput
          v-model.trim="name"
          label="اسم المعلم أو المعلمة"
          type="search"
        />
        <AppButton
          native-type="submit"
          variant="secondary"
          :loading="loading"
        >
          بحث
        </AppButton>
      </form>
    </div>
    <AppErrorState
      v-if="error"
      :message="error"
      @retry="loadArchives"
    />
    <AppTable
      v-else
      :items="students"
      :columns="columns"
      :loading="loading"
      empty-title="لا توجد سجلات"
      empty-description="اختر دفعة أو ابحث بالاسم في الأرشيف."
    >
      <template #cell-name="{ item }">
        {{ item.full_name || item.name }}
      </template>
      <template #cell-department="{ item }">
        {{ item.departmentName || archiveDepartmentName }}
      </template>
      <template #cell-archive="{ item }">
        {{ item.archive_name || selectedArchiveName }}
      </template>
      <template #cell-actions="{ item }">
        <AppButton
          variant="secondary"
          :aria-label="`عرض سجل ${item.full_name || item.name}`"
          @click="openStudent(item)"
        >
          عرض السجل
        </AppButton>
      </template>
    </AppTable>
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
import { AppButton, AppCard, AppErrorState, AppInput, AppSelect, AppTable } from '../ui';
import ArchivedStudentDetailDialog from '../archive/ArchivedStudentDetailDialog.vue';
import presentation from '../../features/archive/archivePresentation';
import { fetchManagementArchive, fetchManagementArchives, fetchManagementArchivedStudent, searchManagementArchivedStudents } from '../../services/managementApi';
export default {
  name: 'CentralArchivesPanel',
  components: { AppButton, AppCard, AppErrorState, AppInput, AppSelect, AppTable, ArchivedStudentDetailDialog },
  props: { departments: { type: Array, default: () => [] } },
  data: () => ({ departmentId: '', archiveId: '', archives: [], students: [], name: '', error: '', loading: false, detail: null, detailOpen: false, detailLoading: false, requestGeneration: 0,
    columns: [{ key: 'name', label: 'الاسم' }, { key: 'department', label: 'الإدارة' }, { key: 'archive', label: 'الدفعة' }, { key: 'actions', label: 'السجل' }],
  }),
  computed: {
    departmentOptions() { return [{ label: 'جميع الإدارات', value: '' }, ...this.departments.map(d => ({ label: d.name, value: d.id }))]; },
    archiveOptions() { return [{ label: 'اختر دفعة', value: '' }, ...this.archives.map(a => ({ label: `${a.name} · ${a.departmentName || ''}`, value: a.id }))]; },
    selectedArchiveName() { return this.archives.find(a => a.id === this.archiveId)?.name || ''; },
    archiveDepartmentName() { return this.archives.find(a => a.id === this.archiveId)?.departmentName || ''; },
  },
  created() { this.loadArchives(); },
  methods: {
    ...presentation,
    async loadArchives() {
      const generation = ++this.requestGeneration;
      this.loading = true; this.error = ''; this.students = []; this.archiveId = ''; this.name = ''; this.detailOpen = false;
      try { const payload = await fetchManagementArchives(this.departmentId); if (generation === this.requestGeneration) this.archives = payload?.archives || payload || []; }
      catch (error) { if (generation === this.requestGeneration) this.error = error?.response?.data?.message || 'تعذر تحميل الأرشيف.'; }
      finally { if (generation === this.requestGeneration) this.loading = false; }
    },
    async loadArchive() {
      const generation = ++this.requestGeneration;
      this.students = []; this.error = ''; this.name = ''; this.detailOpen = false;
      if (!this.archiveId) return;
      this.loading = true;
      try { const payload = await fetchManagementArchive(this.archiveId); if (generation === this.requestGeneration) this.students = payload?.students || []; }
      catch (error) { if (generation === this.requestGeneration) this.error = error?.response?.data?.message || 'تعذر تحميل الدفعة.'; }
      finally { if (generation === this.requestGeneration) this.loading = false; }
    },
    async search() {
      if (!this.name) return this.loadArchive();
      const generation = ++this.requestGeneration;
      this.loading = true; this.error = ''; this.students = []; this.detailOpen = false;
      try { const payload = await searchManagementArchivedStudents(this.name, this.departmentId); if (generation === this.requestGeneration) this.students = payload?.students || payload || []; }
      catch (error) { if (generation === this.requestGeneration) this.error = error?.response?.data?.message || 'تعذر البحث في الأرشيف.'; }
      finally { if (generation === this.requestGeneration) this.loading = false; }
    },
    async openStudent(student) {
      if (this.detailLoading) return;
      this.detail = null; this.detailOpen = true; this.detailLoading = true;
      try { this.detail = await fetchManagementArchivedStudent(student.archive_id || this.archiveId, student.id); }
      catch (error) { this.detailOpen = false; this.$toast.error(error?.response?.data?.message || 'تعذر تحميل سجل المعلم.'); }
      finally { this.detailLoading = false; }
    },
  },
};
</script>
<style scoped>
.central-archives__filters { display: grid; gap: var(--app-space-4); margin-block-end: var(--app-space-4); }
.central-archives__search { display: grid; gap: var(--app-space-3); align-items: start; }
@media (min-width: 768px) { .central-archives__filters { grid-template-columns: 1fr 1fr 2fr; } .central-archives__search { grid-template-columns: minmax(0, 1fr) auto; } }
</style>
<style>
@import "../../styles/views/admin-archive.css";
@import "../../styles/views/admin-archive-dialogs.css";
</style>
