<template>
  <v-dialog
    :model-value="value"
    max-width="440"
    @update:model-value="$emit('input', $event)"
  >
    <div
      class="home-page-settings__confirm"
      role="alertdialog"
      aria-labelledby="home-settings-delete-title"
    >
      <h3
        id="home-settings-delete-title"
        class="home-page-settings__confirm-title"
      >
        تأكيد الحذف
      </h3>
      <p class="home-page-settings__confirm-text">
        سيتم حذف هذا المربع نهائيًا من الواجهة.
      </p>
      <AppActionBar class="home-page-settings__confirm-actions">
        <AppButton
          variant="secondary"
          :disabled="loading"
          @click="$emit('input', false)"
        >
          إلغاء
        </AppButton>
        <AppButton
          variant="danger"
          :loading="loading"
          @click="$emit('confirm')"
        >
          حذف
        </AppButton>
      </AppActionBar>
    </div>
  </v-dialog>
</template>

<script>
import { AppActionBar, AppButton } from '../ui';

export default {
  name: 'HomeSettingsDeleteDialog',
  components: { AppActionBar, AppButton },
  props: {
    value: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
  },
  emits: ['input', 'confirm'],
};
</script>
