<template>
  <AppDialog
    :value="value"
    max-width="720"
    :persistent="filePickerOpen"
    @input="$emit('input', $event)"
    @close="$emit('close')"
  >
    <div class="people-dialog">
      <AppDialogHeader
        class="people-dialog__header"
        :title="title"
        title-tag="h2"
      >
        <template #actions>
          <AppButton
            v-if="!editing && entityType === 'student' && canAddStudent"
            variant="secondary"
            class="people-dialog__bulk-button"
            :disabled="bulkImporting"
            @click="$emit('open-file-picker')"
          >
            {{ bulkImporting ? 'جارٍ الاستيراد...' : 'إضافة جماعية' }}
          </AppButton>
          <input
            id="people-editor-bulk-file"
            ref="bulkFileInput"
            type="file"
            aria-label="ملف الإضافة الجماعية"
            accept=".xlsx,.csv"
            class="people-dialog__bulk-input"
            @change="$emit('file-change', $event)"
          >
        </template>
      </AppDialogHeader>

      <div class="people-dialog__divider" />
      <AppDialogBody class="people-dialog__form">
        <div
          v-if="errors.length"
          class="people-dialog__errors"
          role="alert"
          aria-live="assertive"
        >
          <strong>تعذر حفظ البيانات:</strong>
          <ul>
            <li
              v-for="error in errors"
              :key="error"
            >
              {{ error }}
            </li>
          </ul>
        </div>
        <div
          v-if="!directCardEdit"
          class="people-dialog__field"
        >
          <label
            class="people-dialog__label"
            for="people-editor-entity-type"
          >اختر النوع</label>
          <AppSelect
            id="people-editor-entity-type"
            :value="entityType"
            aria-label="اختر النوع"
            :items="entityOptions"
            item-text="label"
            item-value="value"
            dense
            outlined
            hide-details
            class="people-dialog__select"
            @input="$emit('update:entity-type', $event)"
            @change="$emit('context-change')"
          />
        </div>

        <div
          v-if="!directCardEdit"
          class="people-dialog__field"
        >
          <label
            class="people-dialog__label"
            for="people-editor-branch"
          >اختر الفرع</label>
          <AppSelect
            id="people-editor-branch"
            :value="branchId"
            aria-label="اختر الفرع"
            :items="branchOptions"
            item-text="label"
            item-value="value"
            dense
            outlined
            hide-details
            class="people-dialog__select"
            @input="$emit('update:branch-id', $event)"
            @change="$emit('context-change')"
          />
        </div>

        <div
          v-if="editing && !directCardEdit"
          class="people-dialog__field"
        >
          <label
            class="people-dialog__label"
            for="people-editor-target"
          >{{ targetLabel }}</label>
          <PeopleRemotePicker
            v-if="value"
            input-id="people-editor-target"
            :type="entityType"
            :branch="branchId"
            :label="targetLabel"
            :selected-ids="[targetId]"
            :disabled="submitting"
            @select="$emit('target-change', $event)"
          />
        </div>

        <div class="people-dialog__field">
          <label
            class="people-dialog__label"
            for="people-editor-name"
          >{{ nameLabel }}</label>
          <AppTextField
            id="people-editor-name"
            :value="name"
            :aria-label="nameLabel"
            :placeholder="namePlaceholder"
            dense
            outlined
            hide-details
            class="people-dialog__input"
            @input="$emit('update:name', $event)"
          />
        </div>

        <div
          v-if="entityType === 'reciter'"
          class="people-dialog__field"
        >
          <label
            class="people-dialog__label"
            for="people-editor-linked-students"
          >المعلمون المرتبطون (اختياري)</label>
          <PeopleRemotePicker
            v-if="value"
            input-id="people-editor-linked-students"
            type="student"
            :branch="branchId"
            label="البحث عن معلمين للربط"
            :selected-ids="linkedStudentIds"
            :disabled="submitting"
            multiple
            @select="$emit('toggle-student', $event)"
          />
        </div>

        <div class="people-dialog__field">
          <label
            class="people-dialog__label"
            for="people-editor-login-code"
          >رقم الدخول</label>
          <AppTextField
            id="people-editor-login-code"
            :value="loginCode"
            aria-label="رقم الدخول"
            placeholder="رقم الدخول"
            dense
            outlined
            hide-details
            class="people-dialog__input"
            @input="$emit('update:login-code', $event)"
          />
        </div>

        <div
          class="people-dialog__field"
        >
          <label
            class="people-dialog__label"
            for="people-editor-password"
          >
            {{ editing ? 'كلمة المرور الجديدة (اختياري)' : 'كلمة المرور (اختياري)' }}
          </label>
          <AppPasswordField
            id="people-editor-password"
            :value="password"
            :aria-label="editing ? 'كلمة المرور الجديدة (اختياري)' : 'كلمة المرور (اختياري)'"
            type="password"
            autocomplete="new-password"
            dense
            outlined
            hide-details
            class="people-dialog__input"
            @input="$emit('update:password', $event)"
          />
        </div>

        <div
          class="people-dialog__field"
        >
          <label
            class="people-dialog__label"
            for="people-editor-password-confirmation"
          >تأكيد كلمة المرور</label>
          <AppPasswordField
            id="people-editor-password-confirmation"
            :value="passwordConfirmation"
            aria-label="تأكيد كلمة المرور"
            type="password"
            autocomplete="new-password"
            placeholder="أعد كتابة كلمة المرور"
            dense
            outlined
            hide-details
            class="people-dialog__input"
            @input="$emit('update:password-confirmation', $event)"
          />
        </div>

        <section
          v-if="entityType === 'student' && editing && registrationRows.length"
          class="people-registration-profile"
        >
          <div class="people-registration-profile__title">
            بيانات التسجيل
          </div>
          <div class="people-registration-profile__grid">
            <div
              v-for="item in registrationRows"
              :key="item.label"
              class="people-registration-profile__item"
            >
              <span>{{ item.label }}</span>
              <strong>{{ item.value || '--' }}</strong>
            </div>
          </div>
        </section>
      </AppDialogBody>

      <AppDialogFooter class="people-dialog__actions">
        <AppButton
          variant="primary"
          class="people-dialog__submit"
          :loading="submitting"
          :disabled="submitting"
          @click="$emit('submit')"
        >
          {{ editing ? 'تحديث' : 'إضافة' }}
        </AppButton>
        <AppButton
          variant="secondary"
          class="people-dialog__cancel"
          @click="$emit('close')"
        >
          إلغاء
        </AppButton>
      </AppDialogFooter>
    </div>
  </AppDialog>
</template>

<script>
import PeopleRemotePicker from './PeopleRemotePicker.vue';
import {
  AppButton, AppDialog, AppDialogBody, AppDialogFooter, AppDialogHeader,
  AppPasswordField, AppSelect, AppTextField,
} from '../ui';

export default {
  name: 'PeopleEditorDialog',
  components: {
    PeopleRemotePicker,
    AppButton, AppDialog, AppDialogBody, AppDialogFooter, AppDialogHeader,
    AppPasswordField, AppSelect, AppTextField,
  },
  props: {
    value: Boolean,
    filePickerOpen: Boolean,
    title: { type: String, default: '' },
    editing: Boolean,
    directCardEdit: Boolean,
    entityType: { type: String, default: 'student' },
    canAddStudent: Boolean,
    bulkImporting: Boolean,
    entityOptions: { type: Array, default: () => [] },
    branchId: { type: String, default: '' },
    branchOptions: { type: Array, default: () => [] },
    targetId: { type: String, default: '' },
    targetOptions: { type: Array, default: () => [] },
    targetLabel: { type: String, default: '' },
    nameLabel: { type: String, default: '' },
    namePlaceholder: { type: String, default: '' },
    name: { type: String, default: '' },
    linkedStudents: { type: Array, default: () => [] },
    linkedStudentIds: { type: Array, default: () => [] },
    loginCode: { type: String, default: '' },
    password: { type: String, default: '' },
    passwordConfirmation: { type: String, default: '' },
    registrationRows: { type: Array, default: () => [] },
    errors: { type: Array, default: () => [] },
    submitting: Boolean,
  },
  emits: [
    'close',
    'context-change',
    'file-change',
    'input',
    'open-file-picker',
    'submit',
    'target-change',
    'toggle-student',
    'update:branch-id',
    'update:entity-type',
    'update:login-code',
    'update:name',
    'update:password',
    'update:password-confirmation',
  ],
  methods: {
    clearFileInput() { this.$refs.bulkFileInput.value = ''; },
    openFileInput() { this.$refs.bulkFileInput.click(); },
  },
};
</script>
