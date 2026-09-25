<template>
  <div class="final-exam-dialogs-host">
    <AppDialog
      :value="copyOpen"
      max-width="560"
      @input="$emit('update:copy-open', $event)"
    >
      <DialogShell :title="`نسخ الأسئلة إلى ${targetBranchLabel}`">
        <p>سيتم نسخ جميع أسئلة {{ currentBranchLabel }} إلى {{ targetBranchLabel }}.</p>
        <template #actions>
          <AppButton
            variant="secondary"
            @click="$emit('cancel-copy')"
          >
            إلغاء
          </AppButton>
          <AppButton
            variant="primary"
            :loading="copySubmitting"
            @click="$emit('confirm-copy')"
          >
            موافق
          </AppButton>
        </template>
      </DialogShell>
    </AppDialog>

    <AppDialog
      :value="activationOpen"
      max-width="560"
      @input="$emit('update:activation-open', $event)"
    >
      <DialogShell title="فتح الاختبار النهائي">
        <label for="final-exam-activation-branch">اختر الفرع</label>
        <AppSelect
          id="final-exam-activation-branch"
          :value="activationBranch"
          :items="activationBranchOptions"
          item-text="label"
          item-value="value"
          dense
          outlined
          hide-details
          @input="$emit('update:activation-branch', $event)"
        />
        <label for="final-exam-duration">مدة الفتح بالدقائق</label>
        <input
          id="final-exam-duration"
          :value="durationMinutes"
          type="number"
          min="1"
          class="final-exam-duration-field__input"
          @input="updateDuration($event.target.value)"
        >
        <p
          v-if="activationError"
          class="final-exam-dialog-error"
          role="alert"
        >
          {{ activationError }}
        </p>
        <template #actions>
          <AppButton
            variant="secondary"
            @click="$emit('cancel-activation')"
          >
            إلغاء
          </AppButton>
          <AppButton
            variant="primary"
            :loading="activationSubmitting"
            @click="$emit('confirm-activation')"
          >
            بدء
          </AppButton>
        </template>
      </DialogShell>
    </AppDialog>

    <AppDialog
      :value="manageOpen"
      max-width="560"
      @input="$emit('update:manage-open', $event)"
    >
      <DialogShell title="إدارة الاختبار النهائي">
        <label for="final-exam-manage-choice">الإجراء</label>
        <AppSelect
          id="final-exam-manage-choice"
          :value="manageChoice"
          :items="manageOptions"
          item-text="label"
          item-value="value"
          dense
          outlined
          hide-details
          @input="$emit('update:manage-choice', $event)"
        />
        <template #actions>
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
            تأكيد
          </AppButton>
        </template>
      </DialogShell>
    </AppDialog>
  </div>
</template>

<script>
import { AppButton, AppDialog, AppSelect, DialogShell } from '../ui';

export default {
  name: 'FinalExamDialogs',
  components: { AppButton, AppDialog, AppSelect, DialogShell },
  props: {
    copyOpen: { type: Boolean, default: false }, copySubmitting: { type: Boolean, default: false },
    currentBranchLabel: { type: String, default: '' }, targetBranchLabel: { type: String, default: '' },
    activationOpen: { type: Boolean, default: false }, activationBranch: { type: String, default: '' },
    activationBranchOptions: { type: Array, default: () => [] }, durationMinutes: { type: [Number, String], default: 60 },
    activationError: { type: String, default: '' }, activationSubmitting: { type: Boolean, default: false },
    manageOpen: { type: Boolean, default: false }, manageChoice: { type: String, default: '' },
    manageOptions: { type: Array, default: () => [] }, manageSubmitting: { type: Boolean, default: false },
  },
  methods: {
    updateDuration(value) { this.$emit('update:duration-minutes', value === '' ? '' : Number(value)); },
  },
};
</script>

<style scoped>
.final-exam-dialogs-host { display: contents; }
label { color: #0f172a; font-weight: 800; }
p { margin: 0; color: #4b6478; font-weight: 700; line-height: 2; }
.final-exam-dialog-error { color: #b42318; }
</style>
