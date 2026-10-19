<template>
  <div class="prep-layout communications-page__prep-shell">
    <p
      v-if="readOnly"
      role="status"
    >
      لديك صلاحية العرض فقط. إرسال الإشعارات يحتاج صلاحية الإدارة.
    </p>
    <AppCard
      tag="section"
      class="prep-card communications-page__prep-card admin-workspace-card"
    >
      <AppFilterToolbar>
        <AppFilterField
          for-id="notification-prep-message"
          label="نص الإشعار"
        >
          <AppTextField
            id="notification-prep-message"
            :disabled="readOnly || submitting"
            :value="message"
            dense
            outlined
            hide-details
            placeholder="اكتب الإشعار الذي تريد إرساله للمعلمين"
            class="prep-select communications-page__prep-input"
            @input="$emit('update:message', $event.trim())"
          />
        </AppFilterField>

        <AppFilterField
          for-id="notification-prep-branch"
          label="الفرع"
        >
          <AppSelect
            id="notification-prep-branch"
            :disabled="readOnly || submitting"
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
        </AppFilterField>
      </AppFilterToolbar>

      <div class="prep-filters prep-filters--selection">
        <AppRawButton
          type="button"
          class="attendance-toggle"
          :class="{
            'attendance-toggle--active': allSelected,
            'attendance-toggle--partial': selectedCount > 0 && !allSelected,
          }"
          :disabled="readOnly || !students.length || submitting"
          :aria-pressed="selectedCount > 0 && !allSelected ? 'mixed' : allSelected"
          :aria-label="allSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'"
          :title="allSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'"
          @click="$emit('toggle-all')"
        >
          <span
            class="attendance-toggle__dot"
            aria-hidden="true"
          />
        </AppRawButton>
      </div>

      <div class="prep-table-wrap communications-page__prep-table-wrap">
        <table class="prep-table communications-page__prep-table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>التحديد</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!students.length">
              <td
                colspan="2"
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
              <td class="prep-table__status">
                <AppRawButton
                  type="button"
                  class="attendance-toggle"
                  :class="{ 'attendance-toggle--active': selectedIds.includes(student.value) }"
                  :disabled="readOnly || submitting"
                  :aria-pressed="selectedIds.includes(student.value)"
                  :aria-label="selectedIds.includes(student.value) ? `إلغاء تحديد ${student.label}` : `تحديد ${student.label}`"
                  @click.prevent="$emit('toggle-student', student.value)"
                >
                  <span
                    class="attendance-toggle__dot"
                    aria-hidden="true"
                  />
                </AppRawButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <AppActionBar class="communications-page__prep-actions">
        <AppButton
          variant="primary"
          :loading="submitting"
          :disabled="readOnly || submitting || !message.trim()"
          @click="$emit('submit')"
        >
          {{ submitting ? 'جارٍ الإرسال...' : 'إرسال' }}
        </AppButton>
      </AppActionBar>
    </AppCard>
  </div>
</template>

<script>
import { AppActionBar, AppButton, AppCard, AppFilterField, AppFilterToolbar, AppRawButton, AppSelect, AppTextField } from '../ui';

export default {
  name: 'NotificationPrepPanel',
  components: { AppActionBar, AppButton, AppCard, AppFilterField, AppFilterToolbar, AppRawButton, AppSelect, AppTextField },
  props: {
    readOnly: Boolean,
    allSelected: { type: Boolean, default: false },
    branchId: { type: String, default: null },
    branchOptions: { type: Array, default: () => [] },
    message: { type: String, default: '' },
    selectedCount: { type: Number, default: 0 },
    selectedIds: { type: Array, default: () => [] },
    students: { type: Array, default: () => [] },
    submitting: { type: Boolean, default: false },
  },
  emits: ['update:message', 'update:branch-id', 'toggle-all', 'toggle-student', 'submit'],
};
</script>

<style scoped src="../../styles/components/notification-prep-panel.css"></style>
