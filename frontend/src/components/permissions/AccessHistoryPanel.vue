<template>
  <section aria-label="سجل التغييرات">
    <div class="access-history__heading">
      <h2>سجل التغييرات</h2><AppButton
        variant="secondary"
        :disabled="loading"
        @click="$emit('reload')"
      >
        تحديث
      </AppButton>
    </div>
    <p class="permissions-admin__scope">
      آخر 50 تغييرًا داخل هذه الإدارة. لا تُسجّل كلمات المرور.
    </p>
    <div
      v-if="error"
      role="alert"
      class="permissions-admin__error"
    >
      {{ error }}
    </div>
    <AppTable
      :columns="columns"
      :items="pagedItems"
      :loading="loading"
      empty-title="لا توجد تغييرات مطابقة"
    >
      <template #cell-createdAt="{ value }">
        {{ accessDate(value) }}
      </template>
      <template #cell-event="{ item }">
        <details>
          <summary>{{ item.event }}: {{ item.subject }}</summary>
          <p
            v-for="(change, index) in item.changes"
            :key="index"
          >
            {{ change.label }}: {{ accessValue(change.before) }} ← {{ accessValue(change.after) }}
          </p>
        </details>
      </template>
    </AppTable>
    <AppPagination
      v-model="page"
      :page-count="Math.max(1, Math.ceil(filteredItems.length / 10))"
    />
  </section>
</template>
<script>
import { AppButton, AppPagination, AppTable } from '../ui';
import { accessDate, accessValue } from '../../features/permissions/accessHistoryFormat.mjs';
export default {
  name: 'AccessHistoryPanel', components: { AppButton, AppPagination, AppTable },
  props: { items: { type: Array, default: () => [] }, search: { type: String, default: '' }, loading: Boolean, error: { type: String, default: '' } },
  emits: ['reload'],
  data: () => ({ page: 1, columns: [{ key: 'event', label: 'التغيير' }, { key: 'actorName', label: 'بواسطة' }, { key: 'createdAt', label: 'الوقت' }] }),
  computed: { filteredItems() { const query = this.search.trim(); return this.items.filter(item => `${item.event} ${item.subject} ${item.actorName}`.includes(query)); }, pagedItems() { return this.filteredItems.slice((this.page - 1) * 10, this.page * 10); } },
  watch: { search() { this.page = 1; } }, methods: { accessDate, accessValue },
};
</script>
<style scoped>
.access-history__heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.access-history__heading h2 { font-size: var(--app-font-title); }
summary { cursor: pointer; overflow-wrap: anywhere; }
details p { margin-top: 8px; font-size: var(--app-font-sm); }
</style>
