<template>
  <div
    class="app-table"
    :aria-busy="loading ? 'true' : 'false'"
  >
    <div class="app-table__scroll">
      <table>
        <thead>
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              scope="col"
              :style="{ width: column.width || null }"
            >
              {{ column.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, rowIndex) in items"
            :key="item[itemKey] ?? rowIndex"
            :class="{ 'app-table__row--interactive': hasRowClickListener }"
            :tabindex="hasRowClickListener ? 0 : null"
            :aria-label="hasRowClickListener ? resolveRowAriaLabel(item, rowIndex) : null"
            :aria-keyshortcuts="hasRowClickListener ? 'Enter Space' : null"
            @click="handleRowClick(item, $event)"
            @keydown="handleRowKeydown(item, $event)"
          >
            <td
              v-for="column in columns"
              :key="column.key"
              :data-label="column.label"
            >
              <slot
                :name="`cell-${column.key}`"
                :item="item"
                :value="item[column.key]"
                :index="rowIndex"
              >
                {{ formatValue(item[column.key], column, item) }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <AppLoadingSpinner
      v-if="loading"
      show-label
      class="app-table__state"
    />
    <AppEmptyState
      v-else-if="!items.length"
      :title="emptyTitle"
      :description="emptyDescription"
      class="app-table__state"
    />
  </div>
</template>

<script>
import AppEmptyState from './AppEmptyState.vue';
import AppLoadingSpinner from './AppLoadingSpinner.vue';

const INTERACTIVE_ELEMENT_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  'label',
  '[contenteditable="true"]',
  '[role="button"]',
  '[role="link"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export default {
  name: 'AppTable',
  components: { AppEmptyState, AppLoadingSpinner },
  props: {
    columns: { type: Array, default: () => [] },
    items: { type: Array, default: () => [] },
    itemKey: { type: String, default: 'id' },
    loading: { type: Boolean, default: false },
    emptyTitle: { type: String, default: 'لا توجد بيانات' },
    emptyDescription: { type: String, default: '' },
    rowAriaLabel: { type: [String, Function], default: '' },
  },
  computed: {
    hasRowClickListener() {
      return typeof this.$attrs.onRowClick === 'function';
    },
  },
  methods: {
    activateRow(item) {
      if (this.hasRowClickListener) {
        this.$emit('row-click', item);
      }
    },
    handleRowClick(item, event) {
      if (!this.hasRowClickListener || this.isNestedInteractiveTarget(event)) {
        return;
      }

      this.activateRow(item);
    },
    handleRowKeydown(item, event) {
      const isActivationKey = event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar';
      if (!this.hasRowClickListener || event.target !== event.currentTarget || !isActivationKey) {
        return;
      }

      event.preventDefault();
      this.activateRow(item);
    },
    isNestedInteractiveTarget(event) {
      const target = event?.target;
      const interactiveTarget = typeof target?.closest === 'function'
        ? target.closest(INTERACTIVE_ELEMENT_SELECTOR)
        : null;

      return Boolean(interactiveTarget && interactiveTarget !== event.currentTarget);
    },
    resolveRowAriaLabel(item, rowIndex) {
      const label = typeof this.rowAriaLabel === 'function'
        ? this.rowAriaLabel(item, rowIndex)
        : this.rowAriaLabel;

      return String(label || '').trim() || null;
    },
    formatValue(value, column, item) {
      return typeof column.format === 'function' ? column.format(value, item) : (value ?? '');
    },
  },
};
</script>
