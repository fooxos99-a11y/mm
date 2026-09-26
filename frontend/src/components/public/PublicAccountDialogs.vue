<template>
  <div>
    <AppDialog
      :value="loginOpen"
      max-width="560"
      @input="$emit('update:loginOpen', $event)"
      @close="$emit('close-login')"
    >
      <section class="login-modal__panel">
        <div class="login-modal__brand">
          <slot name="brand" />
        </div>
        <div class="login-modal__copy">
          <h3>تسجيل الدخول</h3>
        </div>
        <div
          v-if="authError"
          class="login-modal__alert"
          role="alert"
        >
          {{ authError }}
        </div>
        <form
          class="login-modal__form"
          @submit.prevent="$emit('submit-login')"
        >
          <AppInput
            :value="loginCode"
            class="login-modal__field"
            label="رقم الدخول"
            type="text"
            :autocomplete="usernameAutocomplete"
            @input="$emit('update:loginCode', String($event).trim())"
          />
          <AppInput
            :value="password"
            class="login-modal__field"
            label="كلمة المرور"
            :type="passwordVisible ? 'text' : 'password'"
            autocomplete="current-password"
            @input="$emit('update:password', $event)"
          >
            <template #append>
              <AppIconButton
                variant="plain"
                size="sm"
                class="login-modal__password-toggle"
                :aria-label="passwordVisible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'"
                @click="passwordVisible = !passwordVisible"
              >
                <AppSvgIcon :icon="passwordVisible ? 'mdi-eye-off-outline' : 'mdi-eye-outline'" />
              </AppIconButton>
            </template>
          </AppInput>
          <AppButton
            native-type="submit"
            block
            class="login-modal__submit"
            :loading="authLoading"
          >
            دخول
          </AppButton>
        </form>
      </section>
    </AppDialog>

    <AppDialog
      :value="profileOpen"
      max-width="520"
      @input="$emit('update:profileOpen', $event)"
      @close="$emit('close-profile')"
    >
      <section
        v-if="currentUser"
        class="profile-modal__panel"
      >
        <div
          v-for="item in profileItems"
          :key="item.label"
          class="profile-modal__card"
        >
          <div class="profile-modal__label">
            {{ item.label }}
          </div>
          <div class="profile-modal__value">
            {{ item.value }}
          </div>
        </div>
      </section>
    </AppDialog>
  </div>
</template>

<script>
import AppButton from '../ui/AppButton.vue';
import AppDialog from '../ui/AppDialog.vue';
import AppIconButton from '../ui/AppIconButton.vue';
import AppInput from '../ui/AppInput.vue';
import AppSvgIcon from '../ui/AppSvgIcon.vue';

export default {
  name: 'PublicAccountDialogs',
  components: {
    AppButton, AppDialog, AppIconButton, AppInput, AppSvgIcon,
  },
  props: {
    loginOpen: { type: Boolean, default: false },
    profileOpen: { type: Boolean, default: false },
    loginCode: { type: String, default: '' },
    password: { type: String, default: '' },
    authError: { type: String, default: '' },
    authLoading: { type: Boolean, default: false },
    currentUser: { type: Object, default: null },
    profileName: { type: String, default: '' },
    accountRoleLabel: { type: String, default: '' },
  },
  emits: [
    'close-login',
    'close-profile',
    'submit-login',
    'update:loginCode',
    'update:loginOpen',
    'update:password',
    'update:profileOpen',
  ],
  data() {
    return { passwordVisible: false, usernameAutocomplete: 'username' };
  },
  computed: {
    profileItems() {
      return [
        { label: 'الاسم', value: this.profileName },
        { label: 'نوع الحساب', value: this.accountRoleLabel },
        { label: 'رقم الدخول', value: this.currentUser?.loginCode || '' },
      ];
    },
  },
};
</script>

<style scoped>
.login-modal__form { display: grid; gap: 18px; }
.login-modal__alert {
  margin-bottom: 18px;
  padding: 12px 14px;
  border: 1px solid #efb7b7;
  border-radius: 10px;
  background: #fff4f4;
  color: #a52222;
  font-size: 0.92rem;
}
.login-modal__field :deep(.app-field__control) { min-height: 48px; }
.login-modal__password-toggle { flex: 0 0 44px; min-width: 44px; min-height: 44px; color: #527887; }
.login-modal__password-toggle .app-svg-icon { width: 21px; height: 21px; }
.login-modal__submit { min-height: 48px; margin-top: 4px; }
</style>
