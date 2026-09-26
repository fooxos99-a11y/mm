<template>
  <AppDialog
    :model-value="isOpen"
    max-width="760"
    @update:model-value="updateOpen"
    @close="closeDialog"
  >
    <div class="registration-fields-dialog app-dialog">
      <AppDialogHeader title="تعديل بيانات التسجيل" />

      <AppDialogBody class="registration-fields-dialog__body">
        <div
          class="registration-fields-dialog__fields-stack"
          aria-label="حقول التسجيل الأساسية"
        >
          <div
            v-for="field in fixedFieldDrafts"
            :key="field.id"
            class="registration-fields-dialog__field-editor registration-fields-dialog__field-editor--fixed"
          >
            <div class="registration-fields-dialog__field-grid">
              <div class="registration-fields-dialog__accept-field">
                <label
                  class="registration-fields-dialog__accept-label"
                  :for="fieldControlId('fixed-label', field.id)"
                >السؤال</label>
                <AppTextField
                  :id="fieldControlId('fixed-label', field.id)"
                  v-model="field.label"
                  class="registration-fields-dialog__input"
                  maxlength="255"
                  dense
                  outlined
                  hide-details
                />
              </div>

              <div class="registration-fields-dialog__accept-field">
                <label
                  class="registration-fields-dialog__accept-label"
                  :for="fieldControlId('fixed-type', field.id)"
                >النوع</label>
                <AppSelect
                  :id="fieldControlId('fixed-type', field.id)"
                  :value="field.type"
                  :items="fieldTypeOptions"
                  item-text="label"
                  item-value="value"
                  class="registration-fields-dialog__input"
                  dense
                  outlined
                  hide-details
                  disabled
                />
              </div>
            </div>
          </div>
        </div>

        <div class="registration-fields-dialog__fields-stack">
          <div
            v-for="(field, index) in formFields"
            :key="field.id"
            class="registration-fields-dialog__field-editor"
          >
            <div class="registration-fields-dialog__field-grid">
              <div class="registration-fields-dialog__accept-field">
                <label
                  class="registration-fields-dialog__accept-label"
                  :for="fieldControlId('label', field.id)"
                >السؤال</label>
                <AppTextField
                  :id="fieldControlId('label', field.id)"
                  v-model.trim="field.label"
                  class="registration-fields-dialog__input"
                  dense
                  outlined
                  hide-details
                />
              </div>

              <div class="registration-fields-dialog__accept-field">
                <span class="registration-fields-dialog__type-header">
                  <label
                    class="registration-fields-dialog__accept-label"
                    :for="fieldControlId('type', field.id)"
                  >النوع</label>
                  <AppIconButton
                    variant="plain"
                    size="sm"
                    class="registration-fields-dialog__delete-field"
                    title="حذف السؤال"
                    aria-label="حذف السؤال"
                    @click.prevent="removeRegistrationField(index)"
                  >
                    <v-icon
                      class="app-action-icon app-action-icon--delete"
                      aria-hidden="true"
                    >
                      mdi-delete-outline
                    </v-icon>
                  </AppIconButton>
                </span>
                <AppSelect
                  :id="fieldControlId('type', field.id)"
                  v-model="field.type"
                  :items="fieldTypeOptions"
                  item-text="label"
                  item-value="value"
                  class="registration-fields-dialog__input"
                  dense
                  outlined
                  hide-details
                />
              </div>
            </div>

            <div
              v-if="field.type === 'select'"
              class="registration-fields-dialog__accept-field"
            >
              <label
                class="registration-fields-dialog__accept-label"
                :for="fieldControlId('options', field.id)"
              >خيارات القائمة - كل خيار في سطر</label>
              <textarea
                :id="fieldControlId('options', field.id)"
                v-model.trim="field.optionsText"
                class="registration-fields-dialog__textarea"
                rows="4"
              />
            </div>

            <div class="registration-fields-dialog__field-actions">
              <v-checkbox
                v-model="field.required"
                label="إلزامي"
                hide-details
                dense
                class="registration-fields-dialog__field-required"
              />
              <v-checkbox
                v-model="field.showInRequests"
                label="إظهار السؤال"
                hide-details
                dense
                class="registration-fields-dialog__field-required"
              />
            </div>
          </div>
        </div>

        <AppButton
          variant="secondary"
          class="registration-fields-dialog__add-field"
          @click="addRegistrationField"
        >
          إضافة سؤال
        </AppButton>
      </AppDialogBody>

      <AppDialogFooter class="registration-fields-dialog__footer">
        <AppButton
          variant="secondary"
          @click="closeDialog"
        >
          إلغاء
        </AppButton>
        <AppButton
          variant="primary"
          :loading="loading"
          @click="submitFields"
        >
          حفظ
        </AppButton>
      </AppDialogFooter>
    </div>
  </AppDialog>
</template>

<script>
import {
  AppButton, AppDialog, AppDialogBody, AppDialogFooter, AppDialogHeader,
  AppIconButton, AppSelect, AppTextField,
} from './ui';
import {
  FIXED_FIELD_DEFINITIONS,
  createRegistrationFieldId,
  normalizeFixedFieldLabels,
} from '../features/registration/registrationFieldLabels.mjs';

export default {
  name: 'RegistrationFieldsDialog',
  components: {
    AppButton,
    AppDialog,
    AppDialogBody,
    AppDialogFooter,
    AppDialogHeader,
    AppIconButton,
    AppSelect,
    AppTextField,
  },
  props: {
    modelValue: {
      type: Boolean,
      default: undefined,
    },
    value: {
      type: Boolean,
      default: false,
    },
    fields: {
      type: Array,
      default: () => [],
    },
    fixedLabels: {
      type: Object,
      default: () => ({}),
    },
    loading: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue', 'input', 'close', 'save'],
  data() {
    return {
      formFields: [],
      fixedFieldDrafts: [],
      fieldTypeOptions: [
        { label: 'نصي', value: 'text' },
        { label: 'رقم', value: 'number' },
        { label: 'قائمة منسدلة', value: 'select' },
      ],
    };
  },
  computed: {
    isOpen() {
      return this.modelValue !== undefined ? this.modelValue : this.value;
    },
  },
  watch: {
    isOpen: {
      immediate: true,
      handler(isOpen) {
        if (isOpen) {
          this.syncFieldDrafts();
          return;
        }

        this.formFields = [];
        this.fixedFieldDrafts = [];
      },
    },
    fixedLabels: {
      deep: true,
      handler() {
        if (this.isOpen) {
          this.syncFixedFieldDrafts();
        }
      },
    },
    fields: {
      deep: true,
      handler() {
        if (this.isOpen) {
          this.syncFieldDrafts();
        }
      },
    },
  },
  methods: {
    updateOpen(value) {
      this.$emit('update:modelValue', value);
      this.$emit('input', value);
    },
    syncFieldDrafts() {
      this.formFields = this.fields.map((field) => this.createFieldDraft(field));
      this.syncFixedFieldDrafts();
    },
    syncFixedFieldDrafts() {
      const labels = normalizeFixedFieldLabels(this.fixedLabels);
      this.fixedFieldDrafts = FIXED_FIELD_DEFINITIONS.map((field) => ({ ...field, label: labels[field.id] }));
    },
    fieldControlId(role, fieldId) {
      return `registration-fields-${role}-${encodeURIComponent(String(fieldId))}`;
    },
    createFieldDraft(field = {}) {
      const options = Array.isArray(field.options) ? field.options : [];

      return {
        id: field.id || createRegistrationFieldId(),
        label: field.label || '',
        type: ['number', 'select'].includes(field.type) ? field.type : 'text',
        required: field.required !== false,
        showInRequests: field.showInRequests !== false,
        optionsText: options.join('\n'),
      };
    },
    addRegistrationField() {
      this.formFields.push(this.createFieldDraft());
    },
    removeRegistrationField(index) {
      this.formFields.splice(index, 1);
    },
    normalizeFieldDrafts() {
      return this.formFields
        .map((field) => ({
          id: field.id,
          label: String(field.label || '').trim(),
          type: ['number', 'select'].includes(field.type) ? field.type : 'text',
          required: Boolean(field.required),
          showInRequests: Boolean(field.showInRequests),
          options: String(field.optionsText || '')
            .split(/\r?\n/)
            .map((option) => option.trim())
            .filter(Boolean),
        }))
        .filter((field) => field.label);
    },
    submitFields() {
      const fixedLabels = normalizeFixedFieldLabels(Object.fromEntries(
        this.fixedFieldDrafts.map((field) => [field.id, field.label]),
      ));

      this.$emit('save', this.normalizeFieldDrafts(), fixedLabels);
    },
    closeDialog() {
      this.$emit('update:modelValue', false);
      this.$emit('input', false);
      this.$emit('close');
    },
  },
};
</script>

<style scoped src="../styles/components/registration-fields-dialog.css"></style>
