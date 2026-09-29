<template>
  <div>
    <div
      v-if="error"
      class="people-alert people-alert--error"
    >
      {{ error }}
      <AppRawButton
        type="button"
        @click="$emit('retry')"
      >
        إعادة المحاولة
      </AppRawButton>
    </div>

    <section
      class="people-toolbar"
      :class="{ 'people-toolbar--with-actions': canCreate }"
    >
      <div class="people-toolbar__filters">
        <div class="people-search-field">
          <label
            for="people-directory-search"
            class="people-filter-field__label"
          >البحث بالاسم أو رقم الدخول</label>
          <AppTextField
            id="people-directory-search"
            :value="search"
            type="search"
            class="people-directory-search"
            autocomplete="off"
            dense
            outlined
            hide-details
            @input="$emit('search', $event)"
          />
        </div>
        <div
          v-if="!managedBranchId"
          class="people-filter-field"
        >
          <label
            for="people-branch-filter"
            class="people-filter-field__label"
          >
            الفرع
          </label>
          <AppSelect
            id="people-branch-filter"
            :value="branch"
            :items="branchOptions"
            item-text="label"
            item-value="value"
            dense
            outlined
            hide-details
            class="people-select"
            @input="handleBranchChange"
          />
        </div>

        <div class="people-filter-field">
          <label
            for="people-entity-filter"
            class="people-filter-field__label"
          >
            الفلتر
          </label>
          <AppSelect
            id="people-entity-filter"
            :value="filter"
            :items="filterOptions"
            item-text="label"
            item-value="value"
            dense
            outlined
            hide-details
            class="people-select"
            @input="$emit('update:filter', $event)"
          />
        </div>
      </div>

      <div
        v-if="canCreate"
        class="people-toolbar__actions"
      >
        <AppRawButton
          type="button"
          class="people-toolbar-button people-toolbar-button--primary"
          @click="$emit('create')"
        >
          إضافة
        </AppRawButton>
      </div>
    </section>

    <section
      v-if="!loading && !error && people.length === 0"
      class="people-empty-state"
    >
      {{ reciterMode ? 'لا يوجد مقرئون مطابقون للفلاتر الحالية.' : 'لا يوجد معلمون مطابقون للفلاتر الحالية.' }}
    </section>

    <section
      v-else
      class="people-cards-list"
    >
      <article
        v-for="person in people"
        :key="person.cardKey"
        class="people-card"
        :class="{ 'people-card--active': !reciterMode && selectedStudentId === person.id }"
        @click="!reciterMode && $emit('select', person.id)"
        @keydown.enter.self="!reciterMode && $emit('select', person.id)"
        @keydown.space.self.prevent="!reciterMode && $emit('select', person.id)"
      >
        <div class="people-card__header">
          <div class="people-card__actions">
            <AppRawButton
              v-if="canEdit"
              type="button"
              class="people-card__icon-button people-card__icon-button--edit"
              :aria-label="reciterMode ? 'تعديل المقرئ' : 'تعديل المعلم'"
              @click.stop="$emit('edit', { type: reciterMode ? 'reciter' : 'student', id: person.id })"
            >
              <v-icon small>
                mdi-pencil-outline
              </v-icon>
            </AppRawButton>

            <AppRawButton
              v-if="canDelete"
              type="button"
              class="people-card__icon-button people-card__icon-button--delete"
              :aria-label="reciterMode ? 'حذف المقرئ' : 'حذف المعلم'"
              @click.stop="$emit('delete', person)"
            >
              <v-icon
                class="app-action-icon app-action-icon--delete"
                aria-hidden="true"
              >
                mdi-delete-outline
              </v-icon>
            </AppRawButton>
          </div>

          <div class="people-card__identity">
            <div class="people-card__name-row">
              <AppRawButton
                v-if="!reciterMode && canEditStudent"
                type="button"
                class="people-card__name people-card__name--button"
                @click.stop="$emit('edit', { type: 'student', id: person.id })"
              >
                {{ person.name }}
              </AppRawButton>
              <h3
                v-else
                class="people-card__name"
              >
                {{ person.name }}
              </h3>
              <span
                v-if="!reciterMode && organizationLabel(person)"
                class="people-card__registration-place"
              >
                {{ organizationLabel(person) }}
              </span>
            </div>
            <AppRawButton
              v-if="!reciterMode && canAssignReciter"
              type="button"
              class="people-card__meta-button"
              :class="{ 'people-card__meta-button--unlinked': person.reciterName === 'غير مرتبط' }"
              @click.stop="$emit('assign-reciter', person)"
            >
              المقرئ: {{ person.reciterName }}
            </AppRawButton>
            <div
              v-else
              class="people-card__meta"
            >
              المعلمون: {{ person.linkedStudentNames }}
            </div>
            <div class="people-card__meta">
              رقم الدخول: {{ person.loginId }}
            </div>
          </div>
        </div>

        <div
          v-if="!reciterMode"
          class="people-card__metrics"
        >
          <div
            v-for="metric in person.metrics"
            :key="metric.key"
            class="people-metric"
            :class="{ 'people-metric--clickable': metric.key === 'parts' }"
            @click.stop="$emit('metric', { person, key: metric.key })"
            @keydown.enter.stop="$emit('metric', { person, key: metric.key })"
            @keydown.space.stop.prevent="$emit('metric', { person, key: metric.key })"
          >
            <div class="people-metric__row">
              <div class="people-metric__value">
                {{ metric.display }}
              </div>
              <div class="people-metric__label">
                {{ metric.label }}
              </div>
            </div>
            <div class="people-metric__track">
              <div
                class="people-metric__fill"
                :style="{ width: metric.progressWidth }"
              />
            </div>
          </div>
        </div>
      </article>
    </section>
    <output
      aria-live="polite"
      class="people-directory-status"
    >
      {{ loading ? 'جارٍ تحميل القائمة...' : (error ? '' : `عدد النتائج: ${total}`) }}
    </output>
    <AppPagination
      v-if="!loading && !error && pageCount > 1"
      :value="page"
      :page-count="pageCount"
      @change="$emit('page', $event)"
    />
  </div>
</template>

<script>
import { AppRawButton, AppSelect, AppTextField, AppPagination } from '../ui';

export default {
  name: 'PeopleDirectoryPanel',
  components: { AppRawButton, AppSelect, AppTextField, AppPagination },
  props: {
    loading: { type: Boolean, default: false },
    search: { type: String, default: '' },
    page: { type: Number, default: 1 },
    pageCount: { type: Number, default: 1 },
    total: { type: Number, default: 0 },
    error: { type: String, default: '' },
    managedBranchId: { type: String, default: '' },
    branch: { type: String, required: true },
    branchOptions: { type: Array, required: true },
    filter: { type: String, required: true },
    filterOptions: { type: Array, required: true },
    canCreate: { type: Boolean, default: false },
    people: { type: Array, required: true },
    reciterMode: { type: Boolean, default: false },
    selectedStudentId: { type: String, default: '' },
    canEdit: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false },
    canEditStudent: { type: Boolean, default: false },
    canAssignReciter: { type: Boolean, default: false },
    organizationLabel: { type: Function, required: true },
  },
  emits: [
    'assign-reciter',
    'branch-change',
    'create',
    'delete',
    'edit',
    'metric',
    'page',
    'retry',
    'search',
    'select',
    'update:branch',
    'update:filter',
  ],
  methods: {
    handleBranchChange(value) {
      this.$emit('update:branch', value);
      this.$emit('branch-change', value);
    },
  },
};
</script>
<style scoped>
.people-directory-status { display: block; margin-block: 16px; color: #375b70; }
</style>
