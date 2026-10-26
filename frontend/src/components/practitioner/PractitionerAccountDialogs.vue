<template>
  <div class="practitioner-account-dialogs">
    <AppDialog
      :value="loginDialogOpen"
      max-width="460"
      @input="$emit('update:login-dialog-open', $event)"
      @close="loginDialogOpen && $emit('close-login')"
    >
      <AccountLoginPanel
        :login-code="loginForm.loginCode"
        :password="loginForm.password"
        dismissible
        :title="pageContent.loginDialogTitle"
        :code-label="pageContent.loginCodeLabel"
        :password-label="pageContent.loginPasswordLabel"
        :submit-label="pageContent.loginSubmitLabel"
        @update:login-code="updateLoginField('loginCode', $event)"
        @update:password="updateLoginField('password', $event)"
        @submit="$emit('submit-login')"
        @close="$emit('close-login')"
      />
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
import AccountLoginPanel from '../auth/AccountLoginPanel.vue';
import { AppDialog } from '../ui';

export default {
  name: 'PractitionerAccountDialogs',
  components: { AppDialog, AccountLoginPanel },
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
