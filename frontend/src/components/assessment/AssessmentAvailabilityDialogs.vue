<template>
  <div class="assessment-dialogs-host">
    <AppDialog
      :value="availabilityOpen"
      max-width="560"
      @input="$emit('update:availability-open', $event)"
    >
      <div class="assessment-dialog assessment-dialog--compact">
        <AppDialogHeader
          :title="`فتح ${availabilityLabel}`"
          initial-focus
        />
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
                id="assessment-availability-branch-label"
                class="assessment-form-card__label"
                for="assessment-availability-branch"
              >اختر الفرع</label>
              <AppSelect
                id="assessment-availability-branch"
                ref="availabilityBranchSelect"
                :value="availabilityBranch"
                :items="branchOptions"
                item-text="label"
                item-value="value"
                dense
                outlined
                hide-details
                class="results-select"
                :menu-props="{ onKeydown: event => closeSelectMenu('availabilityBranchSelect', event) }"
                @keydown.capture="closeSelectMenu('availabilityBranchSelect', $event)"
                @input="$emit('update:availability-branch', $event)"
              />
            </div>

            <div class="assessment-form-card__field-group assessment-form-card__field-group--compact">
              <AppDurationHoursField
                id="assessment-availability-hours"
                :minutes="availabilityMinutes"
                @update:minutes="$emit('update:availability-minutes', $event)"
              />
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
                id="assessment-manage-action-label"
                class="assessment-form-card__label"
                for="assessment-manage-action"
              >الإجراء</label>
              <AppSelect
                id="assessment-manage-action"
                ref="manageActionSelect"
                :value="manageChoice"
                :items="manageOptions"
                item-text="label"
                item-value="value"
                dense
                outlined
                hide-details
                class="assessment-select"
                :menu-props="{ onKeydown: event => closeSelectMenu('manageActionSelect', event) }"
                @keydown.capture="closeSelectMenu('manageActionSelect', $event)"
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
  AppButton, AppDialog, AppDialogBody, AppDialogFooter, AppDialogHeader, AppDurationHoursField, AppSelect,
} from '../ui';

export default {
  name: 'AssessmentAvailabilityDialogs',
  components: {
    AppButton, AppDialog, AppDialogBody, AppDialogFooter, AppDialogHeader, AppDurationHoursField, AppSelect,
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
  methods: {
    closeSelectMenu(refName, event) {
      if (event.key === 'Escape') this.$refs[refName]?.closeMenu(event);
    },
  },
};
</script>
