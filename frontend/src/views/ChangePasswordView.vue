<template>
  <main class="change-password-page">
    <section class="change-password-panel">
      <h1>تحديث كلمة المرور</h1>
      <p>أدخل كلمة المرور الحالية، ثم اختر كلمة مرور جديدة قوية.</p>

      <form @submit.prevent="submit">
        <AppPasswordField
          v-model="form.currentPassword"
          type="password"
          autocomplete="current-password"
          label="كلمة المرور الحالية"
          outlined
          class="change-password-panel__field"
        />
        <AppPasswordField
          v-model="form.password"
          type="password"
          autocomplete="new-password"
          label="كلمة المرور الجديدة"
          :hint="PASSWORD_REQUIREMENTS_TEXT"
          persistent-hint
          outlined
          class="change-password-panel__field"
        />
        <AppPasswordField
          v-model="form.passwordConfirmation"
          type="password"
          autocomplete="new-password"
          label="تأكيد كلمة المرور الجديدة"
          outlined
          class="change-password-panel__field"
        />
        <AppButton
          native-type="submit"
          variant="primary"
          block
          :loading="submitting"
        >
          حفظ كلمة المرور
        </AppButton>
      </form>
    </section>
  </main>
</template>

<script>
import { AppButton, AppPasswordField } from '../components/ui';
import { updatePassword } from '../services/api';
import {
  PASSWORD_REQUIREMENTS_TEXT,
  passwordConfirmationIsValid,
} from '../utils/passwordPolicy.mjs';

export default {
  name: 'ChangePasswordView',
  components: {
    AppButton,
    AppPasswordField,
  },
  data() {
    return {
      PASSWORD_REQUIREMENTS_TEXT,
      submitting: false,
      form: {
        currentPassword: '',
        password: '',
        passwordConfirmation: '',
      },
    };
  },
  methods: {
    async submit() {
      if (!passwordConfirmationIsValid(this.form.password, this.form.passwordConfirmation)) {
        this.$toast.error(`استخدم كلمة مرور مطابقة من ${PASSWORD_REQUIREMENTS_TEXT}`);
        return;
      }

      this.submitting = true;

      try {
        await updatePassword(this.form);
        await this.$store.dispatch('logout');
        this.$toast.success('تم تحديث كلمة المرور. سجل الدخول بالبيانات الجديدة');
        this.$router.replace({ name: 'login' });
      } catch (error) {
        this.$toast.error(
          error?.response?.data?.errors?.currentPassword?.[0]
          || error?.response?.data?.errors?.password?.[0]
          || error?.response?.data?.message
          || 'تعذر تحديث كلمة المرور',
        );
      } finally {
        this.submitting = false;
      }
    },
  },
};
</script>

<style scoped>
.change-password-page {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 24px;
  background: #f4fafb;
}

.change-password-panel {
  width: min(440px, 100%);
  padding: 28px;
  border: 1px solid #d7e7eb;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 16px 36px rgba(15, 69, 96, 0.1);
}

.change-password-panel h1 {
  margin: 0;
  color: #123f56;
  font-size: 1.4rem;
}

.change-password-panel p {
  margin: 8px 0 24px;
  color: #526b78;
  line-height: 1.7;
}

.change-password-panel__field {
  margin-bottom: 16px;
}

@media (max-width: 480px) {
  .change-password-page {
    align-items: start;
    padding: 18px;
  }

  .change-password-panel {
    margin-top: 32px;
    padding: 22px 18px;
  }
}
</style>
