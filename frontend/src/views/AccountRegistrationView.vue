<template>
  <main
    class="account-entry"
    dir="rtl"
  >
    <AppCard title="إنشاء حساب مسؤول">
      <p>أنشئ حساب المسؤول، ثم اربطه بإدارة من لوحة المدير العام.</p>
      <form
        class="account-entry__form"
        @submit.prevent="submit"
      >
        <AppInput
          v-model="form.name"
          label="الاسم الكامل"
          autocomplete="name"
          required
          minlength="6"
          :error="errors.name"
        />
        <AppInput
          v-model.trim="form.loginCode"
          label="رقم الدخول"
          autocomplete="username"
          required
          maxlength="50"
          :error="errors.loginCode || errors.login_code"
          hint="رقم فريد على مستوى الموقع"
        />
        <AppPasswordField
          v-model="form.password"
          label="كلمة المرور"
          autocomplete="new-password"
          :hint="passwordHint"
          persistent-hint
          :error-messages="errors.password"
          required
        />
        <AppPasswordField
          v-model="form.passwordConfirmation"
          label="تأكيد كلمة المرور"
          autocomplete="new-password"
          :error-messages="errors.passwordConfirmation || errors.password_confirmation"
          required
        />
        <p
          v-if="error"
          role="alert"
          class="account-entry__error"
        >
          {{ error }}
        </p>
        <AppButton
          native-type="submit"
          variant="primary"
          :loading="saving"
        >
          إنشاء الحساب
        </AppButton>
        <AppButton
          variant="secondary"
          :to="{ name: 'system-management' }"
          :disabled="saving"
        >
          العودة إلى إدارة النظام
        </AppButton>
      </form>
    </AppCard>
  </main>
</template>

<script>
import { AppButton, AppCard, AppInput, AppPasswordField } from '../components/ui';
import { registerAccount } from '../services/authApi';
import { PASSWORD_REQUIREMENTS_TEXT, passwordConfirmationIsValid } from '../utils/passwordPolicy.mjs';
export default {
  name: 'AccountRegistrationView',
  components: { AppButton, AppCard, AppInput, AppPasswordField },
  data: () => ({ form: { name: '', loginCode: '', password: '', passwordConfirmation: '' }, saving: false, error: '', errors: {}, passwordHint: PASSWORD_REQUIREMENTS_TEXT }),
  methods: {
    async submit() {
      if (this.saving) return;
      this.errors = {};
      this.error = '';
      if (!passwordConfirmationIsValid(this.form.password, this.form.passwordConfirmation)) {
        this.error = 'أدخل كلمة المرور وطابق تأكيدها.';
        return;
      }
      this.saving = true;
      try {
        await registerAccount(this.form);
        this.$toast.success('أُنشئ حساب المسؤول. يمكنك الآن ربطه بإدارة.');
        await this.$router.replace({ name: 'system-management' });
      } catch (error) {
        this.errors = Object.fromEntries(Object.entries(error?.response?.data?.errors || {}).map(([key, values]) => [key, values[0]]));
        this.error = error?.response?.data?.message || 'تعذر إنشاء الحساب. حاول مرة أخرى.';
      } finally { this.saving = false; }
    },
  },
};
</script>
<style scoped src="../styles/views/account-entry.css"></style>
