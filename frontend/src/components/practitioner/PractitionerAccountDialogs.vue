<template>
  <div class="practitioner-account-dialogs">
    <AppDialog
      :value="loginDialogOpen"
      max-width="560"
      @input="$emit('update:login-dialog-open', $event)"
      @close="$emit('close-login')"
    >
      <section class="login-modal__panel">
        <div class="login-modal__brand">
          <img
            :src="$publicAsset('شعار-الجمعية.webp')"
            alt="شعار الجمعية"
            class="login-modal__logo"
          >
          <img
            :src="$publicAsset('اللوقو-شفاف.webp')"
            alt="شعار البرنامج"
            class="login-modal__logo login-modal__logo--program"
          >
        </div>

        <div class="login-modal__copy">
          <h3>{{ pageContent.loginDialogTitle }}</h3>
        </div>

        <v-alert
          v-if="authError"
          type="error"
          dense
          text
          class="login-modal__alert"
        >
          {{ authError }}
        </v-alert>

        <v-form
          class="login-modal__form"
          @submit.prevent="$emit('submit-login')"
        >
          <v-text-field
            :model-value="loginForm.loginCode"
            class="login-modal__field"
            :label="pageContent.loginCodeLabel"
            outlined
            dense
            autocomplete="username"
            @update:model-value="updateLoginField('loginCode', String($event || '').trim())"
          />
          <AppPasswordField
            :value="loginForm.password"
            class="login-modal__field"
            :label="pageContent.loginPasswordLabel"
            outlined
            dense
            type="password"
            autocomplete="current-password"
            @input="updateLoginField('password', $event)"
          />
          <AppButton
            native-type="submit"
            block
            class="login-modal__submit"
            :loading="authLoading"
          >
            {{ pageContent.loginSubmitLabel }}
          </AppButton>
        </v-form>
      </section>
    </AppDialog>

    <AppDialog
      :value="profileDialogOpen"
      max-width="520"
      @input="$emit('update:profile-dialog-open', $event)"
      @close="$emit('close-profile')"
    >
      <section
        v-if="currentUser"
        class="profile-modal__panel"
      >
        <div class="profile-modal__card">
          <div class="profile-modal__label">
            الاسم
          </div>
          <div class="profile-modal__value">
            {{ profileName }}
          </div>
        </div>

        <div class="profile-modal__card">
          <div class="profile-modal__label">
            نوع الحساب
          </div>
          <div class="profile-modal__value">
            {{ accountRoleLabel }}
          </div>
        </div>

        <div class="profile-modal__card">
          <div class="profile-modal__label">
            رقم الدخول
          </div>
          <div class="profile-modal__value">
            {{ currentUser.loginCode }}
          </div>
        </div>
      </section>
    </AppDialog>
  </div>
</template>

<script>
import { AppButton, AppDialog, AppPasswordField } from '../ui';

export default {
  name: 'PractitionerAccountDialogs',
  components: { AppButton, AppDialog, AppPasswordField },
  props: {
    loginDialogOpen: { type: Boolean, default: false },
    profileDialogOpen: { type: Boolean, default: false },
    pageContent: { type: Object, required: true },
    authError: { type: String, default: '' },
    authLoading: { type: Boolean, default: false },
    loginForm: { type: Object, required: true },
    currentUser: { type: Object, default: null },
    profileName: { type: String, default: '' },
    accountRoleLabel: { type: String, default: '' },
  },
  emits: [
    'close-login',
    'close-profile',
    'submit-login',
    'update:login-dialog-open',
    'update:login-form',
    'update:profile-dialog-open',
  ],
  methods: {
    updateLoginField(key, value) {
      this.$emit('update:login-form', {
        ...this.loginForm,
        [key]: value,
      });
    },
  },
};
</script>
