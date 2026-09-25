<template>
  <AppDialog
    :model-value="isOpen"
    max-width="820"
    scrollable
    :persistent="loading"
    @update:model-value="updateOpen"
  >
    <form
      class="registration-acceptance app-dialog"
      @submit.prevent="submit"
    >
      <AppDialogHeader title="معاينة الطلب وإنشاء بيانات الدخول" />
      <AppDialogBody class="registration-acceptance__body">
        <p class="registration-acceptance__hint">
          راجع البيانات وعدّلها عند الحاجة، ثم أدخل رقم الدخول وكلمة المرور التي سيتسلمها الطالب.
        </p>

        <div class="registration-acceptance__grid">
          <label class="registration-acceptance__field">
            <span>الاسم</span>
            <AppTextField
              v-model.trim="draft.name"
              dense
              outlined
              hide-details
            />
          </label>
          <label class="registration-acceptance__field">
            <span>رقم الجوال</span>
            <AppTextField
              v-model.trim="draft.phone"
              inputmode="numeric"
              maxlength="10"
              dense
              outlined
              hide-details
              @input="draft.phone = digitsOnly($event, 10)"
            />
          </label>
          <label class="registration-acceptance__field">
            <span>الجنس</span>
            <AppSelect
              v-model="draft.gender"
              :items="genderOptions"
              item-text="label"
              item-value="value"
              dense
              outlined
              hide-details
              @change="syncBranchWithGender"
            />
          </label>
          <label class="registration-acceptance__field">
            <span>الفرع</span>
            <AppSelect
              v-model="draft.branchId"
              :items="branches"
              item-text="label"
              item-value="value"
              dense
              outlined
              hide-details
            />
          </label>

          <label
            v-for="field in fields"
            :key="field.id"
            class="registration-acceptance__field"
          >
            <span>{{ field.label }}</span>
            <AppSelect
              v-if="field.type === 'select'"
              v-model="draft.answers[field.id]"
              :items="field.options"
              dense
              outlined
              hide-details
            />
            <AppTextField
              v-else
              v-model.trim="draft.answers[field.id]"
              :inputmode="field.type === 'number' ? 'numeric' : undefined"
              dense
              outlined
              hide-details
              @input="field.type === 'number' && setNumericAnswer(field.id, $event)"
            />
          </label>
        </div>

        <div class="registration-acceptance__credentials">
          <h3>بيانات الدخول</h3>
          <p>يقبل النظام أي قيمة تحددها، ومنها رمز من 3 أرقام، ولن يُطلب من الطالب تغييره عند أول دخول.</p>
          <div class="registration-acceptance__grid">
            <label class="registration-acceptance__field">
              <span>رقم الدخول</span>
              <AppTextField
                v-model.trim="draft.loginCode"
                autocomplete="off"
                dense
                outlined
                hide-details
              />
            </label>
            <label class="registration-acceptance__field">
              <span>كلمة المرور</span>
              <AppPasswordField
                v-model="draft.password"
                autocomplete="new-password"
                dense
                outlined
                hide-details
              />
            </label>
          </div>
        </div>
      </AppDialogBody>

      <AppDialogFooter>
        <AppButton
          variant="secondary"
          :disabled="loading"
          @click="close"
        >
          إلغاء
        </AppButton>
        <AppButton
          variant="success"
          native-type="submit"
          :loading="loading"
        >
          قبول وإنشاء الحساب
        </AppButton>
      </AppDialogFooter>
    </form>
  </AppDialog>
</template>

<script>
import { passwordMeetsPolicy, PASSWORD_REQUIREMENTS_TEXT } from '../../utils/passwordPolicy.mjs';
import {
  AppButton, AppDialog, AppDialogBody, AppDialogFooter, AppDialogHeader,
  AppPasswordField, AppSelect, AppTextField,
} from '../ui';

const emptyDraft = () => ({
  name: '', phone: '', gender: '', branchId: '', loginCode: '', password: '', answers: {},
});

export default {
  name: 'RegistrationAcceptanceDialog',
  components: {
    AppButton, AppDialog, AppDialogBody, AppDialogFooter, AppDialogHeader,
    AppPasswordField, AppSelect, AppTextField,
  },
  props: {
    modelValue: { type: Boolean, default: false },
    request: { type: Object, default: null },
    fields: { type: Array, default: () => [] },
    branches: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
  },
  emits: ['update:modelValue', 'accept'],
  data() {
    return {
      draft: emptyDraft(),
      genderOptions: [
        { label: 'ذكر', value: 'male' },
        { label: 'أنثى', value: 'female' },
      ],
    };
  },
  computed: {
    isOpen() { return this.modelValue; },
  },
  watch: {
    isOpen(value) { if (value) this.prepareDraft(); },
    request: { deep: true, handler() { if (this.isOpen) this.prepareDraft(); } },
  },
  methods: {
    prepareDraft() {
      const request = this.request || {};
      this.draft = {
        name: request.name || '',
        phone: request.phone || '',
        gender: request.gender || '',
        branchId: request.branchId || (request.gender === 'female' ? 'female' : 'male'),
        loginCode: request.loginCode || '',
        password: '',
        answers: Object.fromEntries(this.fields.map((field) => [
          field.id,
          request.answers?.[field.id]?.value ?? '',
        ])),
      };
    },
    updateOpen(value) { this.$emit('update:modelValue', value); },
    close() { this.updateOpen(false); },
    syncBranchWithGender() { this.draft.branchId = this.draft.gender === 'female' ? 'female' : 'male'; },
    digitsOnly(value, maxLength = null) {
      const digits = String(value || '').replace(/\D/g, '');
      return maxLength ? digits.slice(0, maxLength) : digits;
    },
    setNumericAnswer(fieldId, value) { this.draft.answers[fieldId] = this.digitsOnly(value); },
    submit() {
      const missingAnswer = this.fields.some((field) => field.required && !String(this.draft.answers[field.id] || '').trim());
      if (this.draft.name.trim().length < 2 || !/^\d{10}$/.test(this.draft.phone) || !this.draft.gender
        || !this.draft.branchId || !this.draft.loginCode.trim() || !this.draft.password || missingAnswer) {
        this.$toast.error('أكمل بيانات الطلب وبيانات الدخول');
        return;
      }
      if (!passwordMeetsPolicy(this.draft.password)) {
        this.$toast.error(PASSWORD_REQUIREMENTS_TEXT);
        return;
      }
      this.$emit('accept', {
        ...this.draft,
        name: this.draft.name.trim(),
        loginCode: this.draft.loginCode.trim(),
        phone: this.draft.phone.trim(),
        answers: { ...this.draft.answers },
      });
    },
  },
};
</script>

<style scoped>
.registration-acceptance__body { max-height: min(70vh, 720px); overflow-y: auto; }
.registration-acceptance__hint { margin: 0 0 18px; color: #526675; font-weight: 700; line-height: 1.8; }
.registration-acceptance__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.registration-acceptance__field { display: grid; min-width: 0; gap: 8px; color: #173f55; font-weight: 800; }
.registration-acceptance__credentials { margin-top: 22px; padding: 18px; border: 1px solid rgba(8, 118, 153, .18); border-radius: 18px; background: rgba(8, 118, 153, .05); }
.registration-acceptance__credentials h3 { margin: 0 0 6px; color: #0f5670; }
.registration-acceptance__credentials p { margin: 0 0 16px; color: #526675; line-height: 1.7; }
@media (max-width: 640px) {
  .registration-acceptance__grid { grid-template-columns: 1fr; }
  .registration-acceptance__credentials { padding: 14px; }
}
</style>
