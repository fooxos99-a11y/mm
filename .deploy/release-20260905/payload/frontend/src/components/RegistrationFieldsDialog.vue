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
            v-for="field in fixedFields"
            :key="field.id"
            class="registration-fields-dialog__field-editor registration-fields-dialog__field-editor--fixed"
          >
            <div class="registration-fields-dialog__field-grid">
              <label class="registration-fields-dialog__accept-field">
                <span class="registration-fields-dialog__accept-label">السؤال</span>
                <AppTextField
                  :value="field.label"
                  class="registration-fields-dialog__input"
                  dense
                  outlined
                  hide-details
                  disabled
                />
              </label>

              <label class="registration-fields-dialog__accept-field">
                <span class="registration-fields-dialog__accept-label">النوع</span>
                <AppSelect
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
              </label>
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
              <label class="registration-fields-dialog__accept-field">
                <span class="registration-fields-dialog__accept-label">السؤال</span>
                <AppTextField
                  v-model.trim="field.label"
                  class="registration-fields-dialog__input"
                  dense
                  outlined
                  hide-details
                />
              </label>

              <label class="registration-fields-dialog__accept-field">
                <span class="registration-fields-dialog__type-header">
                  <span class="registration-fields-dialog__accept-label">النوع</span>
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
                  v-model="field.type"
                  :items="fieldTypeOptions"
                  item-text="label"
                  item-value="value"
                  class="registration-fields-dialog__input"
                  dense
                  outlined
                  hide-details
                />
              </label>
            </div>

            <label
              v-if="field.type === 'select'"
              class="registration-fields-dialog__accept-field"
            >
              <span class="registration-fields-dialog__accept-label">خيارات القائمة - كل خيار في سطر</span>
              <textarea
                v-model.trim="field.optionsText"
                class="registration-fields-dialog__textarea"
                rows="4"
              />
            </label>

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
    loading: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue', 'input', 'close', 'save'],
  data() {
    return {
      formFields: [],
      fixedFields: [
        { id: 'name', label: 'الاسم', type: 'text' },
        { id: 'gender', label: 'الجنس', type: 'select' },
        { id: 'phone', label: 'رقم الجوال', type: 'number' },
      ],
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
    },
    createFieldDraft(field = {}) {
      const options = Array.isArray(field.options) ? field.options : [];

      return {
        id: field.id || `field-${Date.now()}-${Math.random().toString(16).slice(2)}`,
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
      this.$emit('save', this.normalizeFieldDrafts());
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
