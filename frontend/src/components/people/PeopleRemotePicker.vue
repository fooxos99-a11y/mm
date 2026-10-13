<template>
  <fieldset
    class="people-remote-picker"
    :class="{ 'people-remote-picker--tiles': tiles }"
    :disabled="disabled"
    :aria-busy="loading"
  >
    <p v-if="!tiles && !multiple && currentLabel">
      المحدد: {{ currentLabel }}
    </p>
    <input
      v-if="!tiles"
      :id="inputId"
      v-model="search"
      type="search"
      :aria-label="label"
      placeholder="ابحث بالاسم أو رقم الدخول"
      maxlength="100"
      class="people-remote-picker__search"
      @input="scheduleSearch"
    >
    <output
      v-if="!tiles && multiple"
    >
      المحدد: {{ selectedIds.length }}
    </output>
    <AppButton
      v-if="!tiles && allowEmpty"
      variant="secondary"
      @click="$emit('select', '')"
    >
      غير مرتبط
    </AppButton>
    <AppLoadingSpinner v-if="loading && tiles" />
    <output
      v-else-if="loading"
    >
      جارٍ البحث…
    </output>
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
          v-for="option in visibleRows"
          :key="option.value"
          type="button"
          :aria-pressed="selectedIds.includes(option.value)"
          class="people-remote-picker__option"
          @click="choose(option.value)"
        >
          <span
            v-if="selectedIds.includes(option.value)"
            aria-hidden="true"
          >✓ </span>{{ optionLabel(option) }}
        </AppRawButton>
      </div>
      <output
        v-if="!visibleRows.length"
      >
        لا توجد نتائج مطابقة.
      </output>
      <AppPagination
        v-if="pages > 1"
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
import { AppButton, AppRawButton, AppLoadingSpinner } from '../ui';

export default {
  name: 'PeopleRemotePicker',
  components: { AppPagination, AppButton, AppRawButton, AppLoadingSpinner },
  props: {
    type: { type: String, default: 'student' },
    branch: { type: String, required: true },
    label: { type: String, default: 'البحث عن مستخدم' },
    inputId: { type: String, default: undefined },
    currentLabel: { type: String, default: '' },
    selectedIds: { type: Array, default: () => [] },
    tiles: Boolean,
    multiple: Boolean,
    disabled: Boolean,
    allowEmpty: Boolean,
  },
  emits: ['select'],
  data: () => ({ search: '', rows: [], page: 1, pages: 1, loading: false, error: '', generation: 0, controller: null, timer: null }),
  computed: {
    visibleRows() {
      const selected = this.selectedIds.find(Boolean);
      if (this.tiles && selected && this.currentLabel && !this.rows.some((row) => row.value === selected)) {
        return [{ value: selected, label: this.currentLabel, nameOnly: true }, ...this.rows];
      }
      return this.rows;
    },
  },
  watch: {
    type() { this.resetSearch(); },
    branch() { this.resetSearch(); },
  },
  created() { this.load(1); },
  beforeUnmount() { this.cancel(); },
  methods: {
    optionLabel(option) {
      if (!this.tiles || option.nameOnly) return option.label;
      const index = option.label.lastIndexOf(' - ');
      return index < 0 ? option.label : option.label.slice(0, index);
    },
    choose(id) {
      if (this.disabled || this.loading) return;
      if (this.tiles && this.selectedIds.includes(id)) {
        if (this.allowEmpty) this.$emit('select', '');
      } else this.$emit('select', id);
    },
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
.people-remote-picker--tiles .people-remote-picker__options { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; max-height: min(360px, 55dvh); }
.people-remote-picker--tiles .people-remote-picker__option { min-height: 48px; border-color: var(--app-border); }
.people-remote-picker--tiles .people-remote-picker__option[aria-pressed="true"] { background: var(--app-primary); border-color: var(--app-primary); color: #fff; }
</style>
