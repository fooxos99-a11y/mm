<template>
  <div class="assessment-dialogs-host">
    <AppDialog
      :value="availabilityOpen"
      max-width="560"
      @input="$emit('update:availability-open', $event)"
    >
      <div class="assessment-dialog assessment-dialog--compact">
        <AppDialogHeader :title="`فتح ${availabilityLabel}`" />
        <AppDialogBody
          class="assessment-dialog__body assessment-dialog__body--compact"
          compact
        >
          <div class="assessment-form-card assessment-form-card--flat">
            <div
              v-if="!managedBranchId"
              class="assessment-form-card__field-group assessment-form-card__field-group--compact"
            >
              <label
                class="assessment-form-card__label"
                for="assessment-availability-branch"
              >اختر الفرع</label>
              <AppSelect
                id="assessment-availability-branch"
                :value="availabilityBranch"
                :items="branchOptions"
                item-text="label"
                item-value="value"
                dense
                outlined
                hide-details
                class="results-select"
                @input="$emit('update:availability-branch', $event)"
              />
            </div>

            <div class="assessment-form-card__field-group assessment-form-card__field-group--compact">
              <label
                class="assessment-form-card__label"
                for="assessment-availability-minutes"
              >مدة فتح الاختبار بالدقائق</label>
              <input
                id="assessment-availability-minutes"
                :value="availabilityMinutes"
                type="number"
                min="1"
                class="assessment-input"
                placeholder="60"
                @input="$emit('update:availability-minutes', $event.target.value === '' ? '' : Number($event.target.value))"
              >
            </div>
          </div>
        </AppDialogBody>
        <AppDialogFooter class="assessment-dialog__footer">
          <AppButton
            variant="secondary"
            @click="$emit('cancel-availability')"
          >
            إلغاء
          </AppButton>
          <AppButton
            variant="primary"
            :loading="availabilitySubmitting"
            @click="$emit('confirm-availability')"
          >
            {{ availabilitySubmitting ? 'جارٍ الفتح...' : 'فتح الاختبار' }}
          </AppButton>
        </AppDialogFooter>
      </div>
    </AppDialog>

    <AppDialog
      :value="manageOpen"
      max-width="560"
      @input="$emit('update:manage-open', $event)"
    >
      <div class="assessment-dialog assessment-dialog--compact">
        <AppDialogHeader :title="`إدارة ${manageLabel}`" />
        <AppDialogBody
          class="assessment-dialog__body assessment-dialog__body--compact"
          compact
        >
          <div class="assessment-form-card assessment-form-card--flat">
            <div class="assessment-form-card__field-group assessment-form-card__field-group--compact">
              <label
                class="assessment-form-card__label"
                for="assessment-manage-action"
              >الإجراء</label>
              <AppSelect
                id="assessment-manage-action"
                :value="manageChoice"
                :items="manageOptions"
                item-text="label"
                item-value="value"
                dense
                outlined
                hide-details
                class="assessment-select"
                @input="$emit('update:manage-choice', $event)"
              />
            </div>
          </div>
        </AppDialogBody>
        <AppDialogFooter class="assessment-dialog__footer">
          <AppButton
            variant="secondary"
            @click="$emit('cancel-manage')"
          >
            إلغاء
          </AppButton>
          <AppButton
            variant="primary"
            :loading="manageSubmitting"
            @click="$emit('confirm-manage')"
          >
            {{ manageSubmitting ? 'جارٍ التنفيذ...' : 'تأكيد' }}
          </AppButton>
        </AppDialogFooter>
      </div>
    </AppDialog>
  </div>
</template>

<script>
import {
  AppButton, AppDialog, AppDialogBody, AppDialogFooter, AppDialogHeader, AppSelect,
} from '../ui';

export default {
  name: 'AssessmentAvailabilityDialogs',
  components: {
    AppButton, AppDialog, AppDialogBody, AppDialogFooter, AppDialogHeader, AppSelect,
  },
  props: {
    availabilityOpen: { type: Boolean, default: false },
    availabilityLabel: { type: String, default: 'الاختبار' },
    managedBranchId: { type: String, default: '' },
    branchOptions: { type: Array, default: () => [] },
    availabilityBranch: { type: String, default: 'all' },
    availabilityMinutes: { type: [Number, String], default: 60 },
    availabilitySubmitting: { type: Boolean, default: false },
    manageOpen: { type: Boolean, default: false },
    manageLabel: { type: String, default: 'الاختبار' },
    manageChoice: { type: String, default: '' },
    manageOptions: { type: Array, default: () => [] },
    manageSubmitting: { type: Boolean, default: false },
  },
  emits: [
    'update:availability-open',
    'update:availability-branch',
    'update:availability-minutes',
    'cancel-availability',
    'confirm-availability',
    'update:manage-open',
    'update:manage-choice',
    'cancel-manage',
    'confirm-manage',
  ],
};
</script>
