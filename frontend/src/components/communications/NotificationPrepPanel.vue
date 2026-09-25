<template>
  <div class="prep-layout communications-page__prep-shell">
    <section class="prep-card communications-page__prep-card">
      <div class="prep-filters communications-page__prep-filters">
        <div class="prep-field communications-page__prep-field communications-page__prep-field--message">
          <label class="prep-field__label">نص الإشعار</label>
          <AppTextField
            :value="message"
            dense
            outlined
            hide-details
            placeholder="اكتب الإشعار الذي تريد إرساله للمعلمين"
            class="prep-select communications-page__prep-input"
            @input="$emit('update:message', $event.trim())"
          />
        </div>

        <div class="prep-field communications-page__prep-field">
          <label class="prep-field__label">الفرع</label>
          <AppSelect
            :value="branchId"
            aria-label="الفرع"
            :items="branchOptions"
            item-text="label"
            item-value="value"
            dense
            outlined
            hide-details
            class="prep-select communications-page__prep-input"
            @input="$emit('update:branch-id', $event)"
          />
        </div>

        <AppRawButton
          type="button"
          class="attendance-toggle communications-page__bulk-toggle"
          :class="{
            'attendance-toggle--active': allSelected,
            'attendance-toggle--partial': selectedCount > 0 && !allSelected,
          }"
          :disabled="!students.length || submitting"
          :aria-label="allSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'"
          :title="allSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'"
          @click="$emit('toggle-all')"
        >
          <span class="attendance-toggle__dot" />
        </AppRawButton>
      </div>

      <div class="prep-table-wrap communications-page__prep-table-wrap">
        <table class="prep-table communications-page__prep-table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>رقم الدخول</th>
              <th>التحديد</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!students.length">
              <td
                colspan="3"
                class="prep-table__empty"
              >
                لا يوجد معلمون مطابقون للفرع المحدد.
              </td>
            </tr>
            <tr
              v-for="student in students"
              :key="student.value"
            >
              <td class="prep-table__name">
                {{ student.label }}
              </td>
              <td class="prep-table__login">
                {{ student.value || '---' }}
              </td>
              <td class="prep-table__status">
                <AppRawButton
                  type="button"
                  class="attendance-toggle"
                  :class="{ 'attendance-toggle--active': selectedIds.includes(student.value) }"
                  :disabled="submitting"
                  :aria-label="selectedIds.includes(student.value) ? `إلغاء تحديد ${student.label}` : `تحديد ${student.label}`"
                  @click.prevent="$emit('toggle-student', student.value)"
                >
                  <span class="attendance-toggle__dot" />
                </AppRawButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="communications-page__prep-actions">
        <AppButton
          variant="primary"
          :loading="submitting"
          @click="$emit('submit')"
        >
          {{ submitting ? 'جارٍ الإرسال...' : 'إرسال' }}
        </AppButton>
      </div>
    </section>
  </div>
</template>

<script>
import {
  AppButton, AppRawButton, AppSelect, AppTextField,
} from '../ui';

export default {
  name: 'NotificationPrepPanel',
  components: { AppButton, AppRawButton, AppSelect, AppTextField },
  props: {
    allSelected: { type: Boolean, default: false },
    branchId: { type: String, default: null },
    branchOptions: { type: Array, default: () => [] },
    message: { type: String, default: '' },
    selectedCount: { type: Number, default: 0 },
    selectedIds: { type: Array, default: () => [] },
    students: { type: Array, default: () => [] },
    submitting: { type: Boolean, default: false },
  },
};
</script>

<style scoped src="../../styles/components/notification-prep-panel.css"></style>
