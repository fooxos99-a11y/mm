<template>
  <fieldset
    class="people-remote-picker"
    :disabled="disabled"
    :aria-busy="loading"
  >
    <p v-if="!multiple && currentLabel">
      المحدد: {{ currentLabel }}
    </p>
    <input
      v-model="search"
      type="search"
      :aria-label="label"
      placeholder="ابحث بالاسم أو رقم الدخول"
      maxlength="100"
      class="people-remote-picker__search"
      @input="scheduleSearch"
    >
    <p
      v-if="multiple"
      role="status"
    >
      المحدد: {{ selectedIds.length }}
    </p>
    <AppButton
      v-if="allowEmpty"
      variant="secondary"
      @click="$emit('select', '')"
    >
      غير مرتبط
    </AppButton>
    <p
      v-if="loading"
      role="status"
    >
      جارٍ البحث…
    </p>
    <div
      v-else-if="error"
      role="alert"
    >
      {{ error }}
      <AppButton
        variant="secondary"
        @click="load(page)"
      >
        إعادة المحاولة
      </AppButton>
    </div>
    <template v-else>
      <div class="people-remote-picker__options">
        <AppRawButton
          v-for="option in rows"
          :key="option.value"
          type="button"
          :aria-pressed="selectedIds.includes(option.value)"
          class="people-remote-picker__option"
          @click="$emit('select', option.value)"
        >
          {{ selectedIds.includes(option.value) ? '✓ ' : '' }}{{ option.label }}
        </AppRawButton>
      </div>
      <p
        v-if="!rows.length"
        role="status"
      >
        لا توجد نتائج مطابقة.
      </p>
      <AppPagination
        :value="page"
        :page-count="pages"
        @change="load"
      />
    </template>
  </fieldset>
</template>

<script>
import { fetchPeopleOptions } from '../../services/peopleDirectoryApi';
import AppPagination from '../ui/AppPagination.vue';
import { AppButton, AppRawButton } from '../ui';

export default {
  name: 'PeopleRemotePicker',
  components: { AppPagination, AppButton, AppRawButton },
  props: {
    type: { type: String, default: 'student' },
    branch: { type: String, required: true },
    label: { type: String, default: 'البحث عن مستخدم' },
    currentLabel: { type: String, default: '' },
    selectedIds: { type: Array, default: () => [] },
    multiple: Boolean,
    disabled: Boolean,
    allowEmpty: Boolean,
  },
  emits: ['select'],
  data: () => ({ search: '', rows: [], page: 1, pages: 1, loading: false, error: '', generation: 0, controller: null, timer: null }),
  watch: {
    type() { this.resetSearch(); },
    branch() { this.resetSearch(); },
  },
  created() { this.load(1); },
  beforeUnmount() { this.cancel(); },
  methods: {
    cancel() {
      this.generation++;
      this.controller?.abort();
      clearTimeout(this.timer);
    },
    resetSearch() { this.search = ''; this.load(1); },
    scheduleSearch() {
      this.cancel();
      this.rows = [];
      this.loading = true;
      this.timer = setTimeout(() => this.load(1), 300);
    },
    async load(page = 1) {
      this.cancel();
      const generation = this.generation;
      this.controller = new AbortController();
      this.loading = true;
      this.error = '';
      this.rows = [];
      try {
        const result = await fetchPeopleOptions({ type: this.type, branchCode: this.branch, search: this.search.trim(), page, perPage: 20 }, this.controller.signal);
        if (generation !== this.generation) return;
        this.rows = result.data;
        this.page = result.current_page;
        this.pages = result.last_page;
      } catch (error) {
        if (generation !== this.generation || error?.code === 'ERR_CANCELED') return;
        this.error = error?.response?.data?.message || 'تعذر تحميل الخيارات.';
      } finally {
        if (generation === this.generation) this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.people-remote-picker { display: grid; gap: 8px; min-width: 0; border: 0; padding: 0; margin: 0; }
.people-remote-picker__search { width: 100%; min-height: 44px; padding: 10px; border: 1px solid #b9c9cc; border-radius: 8px; }
.people-remote-picker__options { display: grid; gap: 4px; max-height: 240px; overflow-y: auto; }
.people-remote-picker__option { min-height: 44px; padding: 10px; text-align: start; border: 1px solid #d6e1e3; border-radius: 8px; overflow-wrap: anywhere; }
.people-remote-picker__option[aria-pressed="true"] { background: #e5f2ef; border-color: #237768; }
</style>
