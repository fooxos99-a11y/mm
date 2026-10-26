<template>
  <section
    class="account-login"
    dir="rtl"
  >
    <div class="account-login__header">
      <router-link
        :to="{ name: 'home' }"
        class="account-login__brand"
        aria-label="الرئيسية"
      >
        <img
          :src="$publicAsset('شعار-الجمعية.webp')"
          alt="شعار الجمعية"
        >
        <img
          :src="$publicAsset('اللوقو-شفاف.webp')"
          alt="شعار البرنامج"
          class="account-login__program"
        >
      </router-link>
      <AppIconButton
        v-if="dismissible"
        class="account-login__close"
        label="إغلاق"
        @click="$emit('close')"
      >
        <AppSvgIcon icon="mdi-close" />
      </AppIconButton>
      <h1>{{ title }}</h1>
    </div>
    <div class="account-login__body">
      <output
        v-if="!authChecked"
        class="account-login__status"
        aria-live="polite"
      >
        <span>{{ authLoading ? 'جارٍ التحقق من الجلسة…' : authError || 'تحقق من الجلسة للمتابعة.' }}</span>
        <AppButton
          v-if="!authLoading"
          block
          @click="retrySession"
        >
          إعادة المحاولة
        </AppButton>
      </output>
      <form
        v-else
        class="account-login__form"
        @submit.prevent="$emit('submit')"
      >
        <p
          v-if="authError"
          class="account-login__error"
          role="alert"
        >
          {{ authError }}
        </p>
        <AppInput
          :value="loginCode"
          :label="codeLabel"
          :autocomplete="usernameAutocomplete"
          required
          :disabled="authLoading"
          @input="$emit('update:loginCode', String($event).trim())"
        />
        <AppInput
          :value="password"
          :label="passwordLabel"
          :type="passwordVisible ? 'text' : 'password'"
          autocomplete="current-password"
          required
          :disabled="authLoading"
          @input="$emit('update:password', $event)"
        >
          <template #append>
            <AppIconButton
              variant="plain"
              class="account-login__password-toggle"
              :label="passwordVisible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'"
              :aria-pressed="passwordVisible"
              @click="passwordVisible = !passwordVisible"
            >
              <AppSvgIcon :icon="passwordVisible ? 'mdi-eye-off-outline' : 'mdi-eye-outline'" />
            </AppIconButton>
          </template>
        </AppInput>
        <AppButton
          native-type="submit"
          block
          :loading="authLoading"
        >
          {{ submitLabel }}
        </AppButton>
      </form>
    </div>
  </section>
</template>

<script>
import { mapState } from 'vuex';
import { AppButton, AppIconButton, AppInput, AppSvgIcon } from '../ui';
export default {
  name: 'AccountLoginPanel',
  components: { AppButton, AppIconButton, AppInput, AppSvgIcon },
  props: {
    loginCode: { type: String, default: '' }, password: { type: String, default: '' },
    dismissible: { type: Boolean, default: false },
    title: { type: String, default: 'تسجيل الدخول' },
    codeLabel: { type: String, default: 'رقم الدخول' },
    passwordLabel: { type: String, default: 'كلمة المرور' },
    submitLabel: { type: String, default: 'دخول' },
  },
  emits: ['update:loginCode', 'update:password', 'submit', 'close', 'restored'],
  data: () => ({ passwordVisible: false, usernameAutocomplete: 'username' }),
  computed: { ...mapState(['authChecked', 'authLoading', 'authError']) },
  methods: {
    async retrySession() {
      await this.$store.dispatch('bootstrapAuth', { force: true });
      if (this.$store.state.currentUser && this.$store.state.authChecked) this.$emit('restored');
    },
  },
};
</script>
<style src="../../styles/account-login.css"></style>
