<template>
  <div class="completion-panel">
    <div
      v-if="loading"
      class="completion-panel__empty"
    >
      جارٍ حساب المؤشرات...
    </div>
    <div
      v-else-if="!student"
      class="completion-panel__empty"
    >
      {{ emptyMessage }}
    </div>
    <template v-else>
      <div class="completion-panel__head">
        <div>
          <h2>{{ student.name }}</h2>
          <span v-if="showLoginCode">{{ student.loginCode }}</span>
        </div>
        <strong
          class="completion-panel__status"
          :class="`completion-panel__status--${student.status}`"
        >
          {{ resolvedStatusLabel }}
        </strong>
      </div>
      <div class="completion-panel__grid">
        <article
          v-for="requirement in requirements"
          :key="requirement.key"
          class="completion-panel__item"
          :class="{ 'completion-panel__item--met': requirement.met }"
        >
          <div class="completion-panel__top">
            <span>{{ requirement.label }}</span>
            <strong>{{ requirement.value }}</strong>
          </div>
          <div class="completion-panel__track">
            <span :style="{ width: `${requirement.progress}%` }" />
          </div>
          <small>{{ requirement.met ? 'مستوفى' : requirement.missing }}</small>
        </article>
      </div>
    </template>
  </div>
</template>

<script>
import { buildCompletionRequirements, statusLabel } from '../../features/completion/completionRequirementModel.mjs';

export default {
  name: 'CompletionRequirementsPanel',
  props: {
    student: { type: Object, default: null },
    loading: { type: Boolean, default: false },
    showLoginCode: { type: Boolean, default: true },
    emptyMessage: { type: String, default: 'لا توجد بيانات مؤشرات متاحة.' },
  },
  computed: {
    requirements() { return buildCompletionRequirements(this.student?.details); },
    resolvedStatusLabel() { return statusLabel(this.student?.status); },
  },
};
</script>

<style scoped>
.completion-panel__empty { padding: 38px 16px 18px; color: #526675; text-align: center; font-size: .9rem; font-weight: 700; }
.completion-panel__head { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.completion-panel__head h2 { margin: 0; color: #0b3f5b; font-size: 1.1rem; font-weight: 900; }
.completion-panel__head span { color: #5f7482; font-size: .76rem; }
.completion-panel__status { padding: 7px 12px; border-radius: 999px; font-size: .78rem; }
.completion-panel__status--passed { background: #dcfce7; color: #166534; }
.completion-panel__status--in_progress { background: #fef3c7; color: #92400e; }
.completion-panel__status--failed { background: #fee2e2; color: #991b1b; }
.completion-panel__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }
.completion-panel__item { padding: 14px; border: 1px solid #e1eaee; border-radius: 10px; background: #fbfcfd; }
.completion-panel__top { display: flex; justify-content: space-between; gap: 10px; color: #38596b; font-size: .84rem; font-weight: 800; }
.completion-panel__track { height: 7px; margin: 11px 0 8px; overflow: hidden; border-radius: 999px; background: #e6edf0; }
.completion-panel__track span { display: block; height: 100%; border-radius: inherit; background: #d97706; }
.completion-panel__item--met .completion-panel__track span { background: #16a34a; }
.completion-panel__item small { color: #8a6b32; font-size: .72rem; }
.completion-panel__item--met small { color: #15803d; }
@media (max-width: 640px) {
  .completion-panel__head { align-items: stretch; flex-direction: column; }
  .completion-panel__status { align-self: flex-start; }
  .completion-panel__grid { grid-template-columns: 1fr; }
}
</style>
