<template>
  <AppCard
    tag="section"
    class="admin-archive-view__card admin-workspace-card"
  >
    <AppFilterToolbar>
      <AppFilterField
        for-id="archive-record-filter"
        label="الأرشيف"
      >
        <div class="admin-archive-view__select-row">
          <AppSelect
            id="archive-record-filter"
            :value="archiveId || ''"
            :items="archiveOptions"
            item-text="display_name"
            item-value="id"
            hide-details
            class="admin-archive-view__select"
            @input="handleArchiveChange"
          />
        </div>
      </AppFilterField>

      <AppFilterField
        for-id="archive-records-search"
        label="البحث باسم الطالب"
      >
        <div class="admin-archive-view__search-row">
          <input
            id="archive-records-search"
            :value="searchQuery"
            type="search"
            class="admin-archive-view__search-input app-filter-input"
            placeholder="اكتب اسم الطالب"
            aria-label="البحث باسم الطالب"
            @input="$emit('update:search-query', $event.target.value)"
          >
        </div>
      </AppFilterField>
    </AppFilterToolbar>

    <div
      v-if="!showWorkspace"
      class="admin-archive-view__empty"
    >
      يرجى اختيار الأرشيف أو البحث باسم الطالب لعرض السجلات.
    </div>

    <div
      v-else
      class="admin-archive-view__workspace"
    >
      <div class="admin-archive-view__table-shell">
        <div class="admin-archive-view__table-head">
          <h2 class="admin-archive-view__section-title">
            {{ title }}
          </h2>
        </div>
        <v-data-table
          :headers="headers"
          :items="students"
          :loading="loading"
          class="admin-archive-view__table elevation-0"
          :no-data-text="emptyText"
        >
          <template #[`item.full_name`]="{ item }">
            <AppRawButton
              type="button"
              class="admin-archive-view__student-link"
              :class="{ 'admin-archive-view__student-link--active': selectedStudentId === item.id }"
              @click="$emit('open-student', item)"
            >
              {{ item.full_name }}
            </AppRawButton>
          </template>
          <template #[`item.archive_name`]="{ item }">
            {{ item.archive_name || '---' }}
          </template>
          <template #[`item.branch`]="{ item }">
            {{ item.branch ? item.branch.name : '' }}
          </template>
          <template #[`item.created_at`]="{ item }">
            {{ formatDate(item.created_at) }}
          </template>
        </v-data-table>
      </div>
    </div>
    <AppActionBar
      v-if="selectedArchive?.can_manage === true"
      class="admin-archive-view__footer"
    >
      <AppButton
        variant="danger"
        :disabled="Boolean(deletingArchiveId)"
        :aria-label="`حذف الأرشيف ${selectedArchive.name}`"
        @click="$emit('delete-archive', selectedArchive)"
      >
        <v-icon
          size="20"
          aria-hidden="true"
        >
          mdi-delete-outline
        </v-icon>
        حذف الأرشيف نهائيًا
      </AppButton>
    </AppActionBar>
  </AppCard>
</template>

<script>
import { AppButton, AppCard, AppFilterField, AppFilterToolbar, AppActionBar, AppSelect, AppRawButton } from '../ui';

export default {
  name: 'ArchiveRecordsPanel',
  components: { AppButton, AppCard, AppFilterField, AppFilterToolbar, AppActionBar, AppSelect, AppRawButton },
  props: {
    archiveId: { type: String, default: null },
    archives: { type: Array, required: true },
    archiveDetail: { type: Object, default: null },
    deletingArchiveId: { type: String, default: '' },
    searchQuery: { type: String, default: '' },
    showWorkspace: { type: Boolean, default: false },
    title: { type: String, required: true },
    headers: { type: Array, required: true },
    students: { type: Array, required: true },
    loading: { type: Boolean, default: false },
    emptyText: { type: String, required: true },
    selectedStudentId: { type: String, default: '' },
    formatDate: { type: Function, required: true },
  },
  emits: [
    'delete-archive',
    'update:search-query',
    'open-student',
    'update:archive-id',
    'archive-change',
  ],
  computed: {
    archiveOptions() {
      return [{ id: '', display_name: 'اختر الدفعة أو الأرشيف' }, ...this.archives.map(archive => ({
        ...archive,
        display_name: archive.department_name ? `${archive.name} — ${archive.department_name}` : archive.name,
      }))];
    },
    selectedArchive() {
      return this.archiveDetail?.id === this.archiveId ? this.archiveDetail
        : this.archives.find((archive) => archive.id === this.archiveId) || null;
    },
  },
  methods: {
    handleArchiveChange(value) {
      this.$emit('update:archive-id', value);
      this.$emit('archive-change');
    },
  },
};
</script>
