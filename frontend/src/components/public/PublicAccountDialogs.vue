<template>
  <div>
    <AppDialog
      :value="loginOpen"
      max-width="460"
      @input="$emit('update:loginOpen', $event)"
      @close="loginOpen && $emit('close-login')"
    >
      <AccountLoginPanel
        :login-code="loginCode"
        :password="password"
        dismissible
        @update:login-code="$emit('update:loginCode', $event)"
        @update:password="$emit('update:password', $event)"
        @submit="$emit('submit-login')"
        @close="$emit('close-login')"
      />
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
import AccountLoginPanel from '../auth/AccountLoginPanel.vue';
import AppDialog from '../ui/AppDialog.vue';

export default {
  name: 'PublicAccountDialogs',
  components: {
    AppDialog, AccountLoginPanel,
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
