<template>
  <nav
    v-if="pageCount > 1"
    class="app-pagination"
    aria-label="التنقل بين الصفحات"
  >
    <button
      type="button"
      class="app-pagination__button"
      :disabled="currentValue <= 1"
      aria-label="الصفحة السابقة"
      @click="setPage(currentValue - 1)"
    >
      <v-icon size="20">
        mdi-chevron-right
      </v-icon>
    </button>
    <button
      v-for="page in visiblePages"
      :key="page"
      type="button"
      class="app-pagination__button"
      :class="{ 'app-pagination__button--active': page === currentValue }"
      :aria-current="page === currentValue ? 'page' : null"
      @click="setPage(page)"
    >
      {{ page }}
    </button>
    <button
      type="button"
      class="app-pagination__button"
      :disabled="currentValue >= pageCount"
      aria-label="الصفحة التالية"
      @click="setPage(currentValue + 1)"
    >
      <v-icon size="20">
        mdi-chevron-left
      </v-icon>
    </button>
  </nav>
</template>

<script>
export default {
  name: 'AppPagination',
  props: {
    modelValue: { type: Number, default: undefined },
    value: { type: Number, default: 1 },
    pageCount: { type: Number, default: 1 },
    maxVisible: { type: Number, default: 5 },
  },
  emits: ['update:modelValue', 'input', 'change'],
  computed: {
    currentValue() {
      return this.modelValue !== undefined ? this.modelValue : this.value;
    },
    visiblePages() {
      const count = Math.min(this.maxVisible, this.pageCount);
      const start = Math.max(1, Math.min(this.currentValue - Math.floor(count / 2), this.pageCount - count + 1));
      return Array.from({ length: count }, (_, index) => start + index);
    },
  },
  methods: {
    setPage(page) {
      const nextPage = Math.max(1, Math.min(this.pageCount, page));
      this.$emit('update:modelValue', nextPage);
      this.$emit('input', nextPage);
      this.$emit('change', nextPage);
    },
  },
};
</script>
