<template>
  <section
    class="assessment-attendance"
    aria-label="تحضير المعلمين"
  >
    <div class="assessment-attendance__tools">
      <AppButton
        variant="secondary"
        :disabled="!canEdit || !students.length || saving"
        :aria-pressed="allChecked"
        :aria-label="allChecked ? 'إلغاء تحديد حضور الجميع' : 'تحديد حضور الجميع'"
        @click="$emit('toggle-all')"
      >
        {{ allChecked ? 'إلغاء تحضير الجميع' : 'تحضير الجميع' }}
      </AppButton>
    </div>
    <div
      v-if="students.length"
      class="assessment-attendance__list"
      role="list"
    >
      <div
        class="assessment-attendance__head"
        aria-hidden="true"
      >
        <span>المعلّم</span><span>التحضير</span>
      </div>
      <div
        v-for="student in students"
        :key="student.id"
        class="assessment-attendance__row"
        role="listitem"
      >
        <span class="assessment-attendance__name">{{ student.name }}</span>
        <AppButton
          :variant="checkedIds.includes(student.id) ? 'primary' : 'secondary'"
          class="attendance-toggle"
          :class="{ 'attendance-toggle--active': checkedIds.includes(student.id) }"
          :disabled="!canEdit || saving"
          :aria-label="`تبديل حضور ${student.name}`"
          :aria-pressed="checkedIds.includes(student.id)"
          @click="$emit('toggle-student', student.id)"
        >
          {{ checkedIds.includes(student.id) ? 'حاضر' : 'تحضير' }}
        </AppButton>
      </div>
    </div>
    <AppEmptyState
      v-else
      title-tag="h2"
      title="لا يوجد معلمون في هذا الفرع"
    />
    <footer
      v-if="saveFailed"
      class="assessment-attendance__footer"
    >
      <p
        role="alert"
        class="assessment-attendance__error"
      >
        {{ saveStatus }}
      </p>
      <AppButton
        v-if="canEdit"
        variant="secondary"
        :loading="saving"
        :disabled="!students.length || saving"
        @click="$emit('save')"
      >
        إعادة محاولة الحفظ
      </AppButton>
    </footer>
  </section>
</template>
<script>
import { AppButton, AppEmptyState } from '../ui';
export default {
  name: 'AssessmentAttendanceList',
  components: { AppButton, AppEmptyState },
  props: {
    students: { type: Array, required: true }, checkedIds: { type: Array, required: true },
    allChecked: Boolean, canEdit: Boolean, saving: Boolean,
    saveStatus: { type: String, default: '' },
  },
  emits: ['toggle-all', 'toggle-student', 'save'],
  computed: {
    saveFailed() { return this.saveStatus.includes('تعذر'); },
  },
};
</script>
<style scoped>
.assessment-attendance { min-width: 0; }
.assessment-attendance__tools { display: flex; justify-content: flex-end; margin-bottom: 16px; }
.assessment-attendance__footer p { margin: 0; color: var(--app-text-muted); font-size: var(--app-font-sm); }
.assessment-attendance__head, .assessment-attendance__row { display: grid; grid-template-columns: minmax(0, 1fr) 76px; align-items: center; gap: 12px; }
.assessment-attendance__head { padding: 8px 0; color: var(--app-text-muted); font-size: 0.75rem; border-bottom: 1px solid var(--app-border); }
.assessment-attendance__row { min-height: 64px; padding: 8px 0; border-bottom: 1px solid var(--app-border); }
.assessment-attendance__name { min-width: 0; overflow-wrap: anywhere; color: var(--app-primary-dark); font-weight: 700; line-height: 1.5; }
.assessment-attendance .attendance-toggle { width: auto; min-width: 0; height: auto; min-height: 44px; padding: 8px; border-radius: 8px; font-size: var(--app-font-sm); }
.assessment-attendance .attendance-toggle--active { border-color: var(--app-primary); }
.assessment-attendance .attendance-toggle--active:disabled { background: var(--app-primary); color: #fff; opacity: 1; }
.assessment-attendance__footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding-top: 16px; }
.assessment-attendance__footer .assessment-attendance__error { color: var(--app-danger); }
@media (min-width: 768px) { .assessment-attendance__head, .assessment-attendance__row { grid-template-columns: minmax(0, 1fr) 88px; } }
</style>
