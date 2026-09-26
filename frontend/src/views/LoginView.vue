<template>
  <div class="login-page">
    <div class="login-page__backdrop" />
    <div class="login-shell">
      <section class="login-panel">
        <router-link
          :to="{ name: 'home' }"
          class="login-panel__brand"
        >
          <img
            :src="$publicAsset('شعار-الجمعية.webp')"
            alt="شعار الجمعية"
            class="login-panel__logo"
          >
          <img
            :src="$publicAsset('اللوقو-شفاف.webp')"
            alt="شعار البرنامج"
            class="login-panel__logo"
          >
        </router-link>

        <div class="login-panel__copy">
          <p class="login-panel__eyebrow">
            تسجيل الدخول
          </p>
          <h1>الدخول إلى الحساب</h1>
          <p>استخدم رقم الدخول وكلمة المرور للدخول إلى لوحة البرنامج.</p>
        </div>

        <v-alert
          v-if="authError"
          type="error"
          dense
          text
          class="login-panel__alert"
        >
          {{ authError }}
        </v-alert>

        <v-form
          class="login-form"
          @submit.prevent="submitLogin"
        >
          <v-text-field
            v-model.trim="form.loginCode"
            label="رقم الدخول"
            outlined
            dense
            autocomplete="username"
            class="login-form__field"
          />
          <AppPasswordField
            v-model="form.password"
            label="كلمة المرور"
            outlined
            dense
            type="password"
            autocomplete="current-password"
            class="login-form__field"
          />
          <AppButton
            native-type="submit"
            variant="primary"
            block
            class="login-form__submit"
            :loading="authLoading"
          >
            دخول
          </AppButton>
        </v-form>
      </section>
    </div>
  </div>
</template>

<script>
import { mapActions, mapState } from 'vuex';
import { AppButton, AppPasswordField } from '../components/ui';
import { resolveUserHomeRoute } from '../utils/authRoutes';

export default {
  name: 'LoginView',
  components: {
    AppButton,
    AppPasswordField,
  },
  data() {
    return {
      form: {
        loginCode: '',
        password: '',
      },
    };
  },
  computed: {
    ...mapState(['authError', 'authLoading', 'currentUser']),
  },
  methods: {
    ...mapActions(['login']),
    async submitLogin() {
      if (!this.form.loginCode || !this.form.password) {
        return;
      }

      try {
        await this.login(this.form);
        this.$router.replace(this.$route.query.redirect || resolveUserHomeRoute(this.currentUser));
      } catch {
        // Error state is already managed by Vuex.
      }
    },
  },
};
</script>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow: hidden;
  background: radial-gradient(circle at top, #1c8ca5 0%, #136b87 36%, #063041 100%);
}

.login-page__backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 18% 20%, rgba(255, 255, 255, 0.14), transparent 30%),
    radial-gradient(circle at 82% 18%, rgba(255, 255, 255, 0.1), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), transparent 55%);
}

.login-shell {
  position: relative;
  z-index: 1;
  width: min(460px, 100%);
}

.login-panel {
  padding: 32px 28px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 32px 60px -34px rgba(1, 27, 37, 0.55);
  direction: rtl;
}

.login-panel__brand {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-bottom: 22px;
}

.login-panel__logo {
  height: 64px;
  width: auto;
  object-fit: contain;
}

.login-panel__copy {
  text-align: center;
  color: #063041;
}

.login-panel__copy h1 {
  margin: 0;
  font-size: 2rem;
  font-weight: 900;
}

.login-panel__copy p {
  margin: 10px 0 0;
  line-height: 1.8;
  color: rgba(6, 48, 65, 0.78);
}

.login-panel__eyebrow {
  margin: 0 0 10px;
  font-size: 0.88rem;
  font-weight: 800;
  color: #107699;
}

.login-panel__alert {
  margin-top: 20px;
}

.login-form {
  margin-top: 24px;
}

.login-form__field + .login-form__field {
  margin-top: 10px;
}

.login-form__submit {
  margin-top: 18px;
  height: 50px !important;
  border-radius: 16px;
  font-weight: 800;
}
</style>
