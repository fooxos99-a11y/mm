<template>
  <div>
    <AppDialog
      :value="adminsOpen"
      max-width="760"
      @input="$emit('update:admins-open', $event)"
      @close="$emit('close-admins')"
    >
      <v-card class="dashboard-dialog-card dashboard-supervision-manager pa-0">
        <div class="dashboard-dialog-card__header dashboard-dialog-card__header--panel dashboard-supervision-manager__header px-5 py-4">
          <h2 class="dashboard-dialog-card__title">
            الإشراف
          </h2>
        </div>

        <div class="dashboard-supervision-manager__body px-5 pt-5 pb-4">
          <DashboardAccountsPanel
            :active="adminsOpen"
            embedded
            @busy-change="$emit('accounts-busy', $event)"
          />
        </div>

        <AppDialogFooter class="dashboard-supervision-manager__footer px-5 py-4">
          <AppButton
            variant="secondary"
            class="dashboard-course-manager__cancel"
            @click="$emit('close-admins')"
          >
            إلغاء
          </AppButton>
        </AppDialogFooter>
      </v-card>
    </AppDialog>

    <AppDialog
      :value="templatesOpen"
      max-width="720"
      @input="$emit('update:templates-open', $event)"
    >
      <v-card class="dashboard-dialog-card dashboard-templates-manager pa-0">
        <div class="dashboard-dialog-card__header dashboard-dialog-card__header--panel dashboard-templates-manager__header px-5 py-4">
          <h2 class="dashboard-dialog-card__title">
            قوالب إشعارات الدورات
          </h2>
        </div>

        <div class="dashboard-templates-manager__body px-5 pt-5 pb-4">
          <div class="dashboard-template-field">
            <label
              for="dashboard-templates-course"
              class="dashboard-supervision-field__label"
            >الدورة</label>
            <AppSelect
              id="dashboard-templates-course"
              :value="selectedCourseId"
              :items="courseOptions"
              item-text="label"
              item-value="value"
              dense
              outlined
              hide-details
              class="dashboard-supervision-field__input dashboard-template-field__input"
              @input="$emit('update:selected-course-id', $event)"
            />
          </div>

          <div class="dashboard-template-grid">
            <div
              v-for="field in templateFields"
              :key="field.key"
              class="dashboard-template-field"
            >
              <label
                :for="`dashboard-template-${field.key}`"
                class="dashboard-supervision-field__label"
              >{{ field.label }}</label>
              <v-textarea
                :id="`dashboard-template-${field.key}`"
                :model-value="draft[field.key]"
                rows="3"
                outlined
                hide-details
                class="dashboard-template-field__input dashboard-template-field__input--textarea"
                @update:model-value="$emit('update-template', { key: field.key, value: $event })"
              />
            </div>
          </div>
        </div>

        <AppDialogFooter class="dashboard-supervision-manager__footer dashboard-templates-manager__footer px-5 py-4">
          <AppButton
            variant="secondary"
            class="dashboard-course-manager__cancel"
            @click="$emit('update:templates-open', false)"
          >
            إلغاء
          </AppButton>
          <AppButton
            variant="primary"
            class="dashboard-supervision-manager__submit"
            :loading="submitting"
            :disabled="!selectedCourseId"
            @click="$emit('save-templates')"
          >
            حفظ
          </AppButton>
        </AppDialogFooter>
      </v-card>
    </AppDialog>
  </div>
</template>

<script>
import {
  AppButton, AppDialog, AppDialogFooter, AppSelect,
} from '../ui';
import DashboardAccountsPanel from './DashboardAccountsPanel.vue';

export default {
  name: 'DashboardManagementDialogs',
  components: {
    AppButton, AppDialog, AppDialogFooter, AppSelect, DashboardAccountsPanel,
  },
  props: {
    adminsOpen: { type: Boolean, default: false },
    courseOptions: { type: Array, default: () => [] },
    draft: { type: Object, required: true },
    selectedCourseId: { type: String, default: '' },
    submitting: { type: Boolean, default: false },
    templatesOpen: { type: Boolean, default: false },
  },
  emits: [
    'update:admins-open',
    'close-admins',
    'accounts-busy',
    'update:templates-open',
    'update:selected-course-id',
    'update-template',
    'save-templates',
  ],
  data: () => ({
    templateFields: [
      { key: 'pre', label: 'قالب القبلي' },
      { key: 'post', label: 'قالب البعدي' },
      { key: 'tasks', label: 'قالب المهام' },
    ],
  }),
};
</script>
