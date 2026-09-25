<template>
  <section class="admin-archive-view__card">
    <div class="admin-archive-view__toolbar">
      <div class="admin-archive-view__field admin-archive-view__field--select">
        <label
          for="archive-record-filter"
          class="admin-archive-view__field-label"
        >
          الأرشيف
        </label>
        <div class="admin-archive-view__select-row">
          <AppNativeSelect
            id="archive-record-filter"
            :value="archiveId || ''"
            class="admin-archive-view__select"
            @input="handleArchiveChange"
          >
            <option value="">
              اختر الدفعة أو الأرشيف
            </option>
            <option
              v-for="archive in archives"
              :key="archive.id"
              :value="archive.id"
            >
              {{ archive.name }}
            </option>
          </AppNativeSelect>
          <AppButton
            v-if="selectedArchive"
            type="button"
            class="admin-archive-view__select-option-delete"
            variant="danger"
            :loading="deletingArchiveId === selectedArchive.id"
            :aria-label="`حذف الأرشيف ${selectedArchive.name}`"
            @click="$emit('delete-archive', selectedArchive)"
          >
            <v-icon
              size="20"
              aria-hidden="true"
            >
              mdi-delete-outline
            </v-icon>
            <span>حذف الأرشيف نهائيًا</span>
          </AppButton>
        </div>
      </div>

      <div class="admin-archive-view__field admin-archive-view__field--search">
        <label class="admin-archive-view__field-label">البحث باسم الطالب</label>
        <div class="admin-archive-view__search-row">
          <input
            :value="searchQuery"
            type="search"
            class="admin-archive-view__search-input"
            placeholder="اكتب اسم الطالب"
            aria-label="البحث باسم الطالب"
            @input="$emit('update:search-query', $event.target.value)"
          >
        </div>
      </div>
    </div>

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
  </section>
</template>

<script>
import { AppButton, AppNativeSelect, AppRawButton } from '../ui';

export default {
  name: 'ArchiveRecordsPanel',
  components: { AppButton, AppNativeSelect, AppRawButton },
  props: {
    archiveId: { type: String, default: null },
    archives: { type: Array, required: true },
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
  computed: {
    selectedArchive() {
      return this.archives.find((archive) => archive.id === this.archiveId) || null;
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
