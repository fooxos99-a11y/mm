<template>
  <div
    ref="page"
    class="login-page"
  >
    <AccountLoginPanel
      v-model:login-code="form.loginCode"
      v-model:password="form.password"
      @submit="submitLogin"
      @restored="finishLogin"
    />
  </div>
</template>
<script>
import AccountLoginPanel from '../components/auth/AccountLoginPanel.vue';
import { resolveLoginDestination } from '../utils/authRoutes';
import { observeOverlayViewport } from '../utils/overlayViewport';
export default {
  name: 'LoginView',
  components: { AccountLoginPanel },
  data: () => ({ form: { loginCode: '', password: '' } }),
  mounted() { this.stopViewport = observeOverlayViewport(this.$refs.page); },
  beforeUnmount() { this.stopViewport?.(); },
  methods: {
    finishLogin() {
      this.$router.replace(resolveLoginDestination(this.$router, this.$route.query.redirect, this.$store.state.currentUser));
    },
    async submitLogin() {
      if (!this.form.loginCode || !this.form.password) return;
      try { await this.$store.dispatch('login', this.form); this.finishLogin(); } catch { /* Store displays errors. */ }
    },
  },
};
</script>
<style scoped>
.login-page {
  min-height: var(--overlay-height, 100dvh);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
  background: radial-gradient(circle at top, #1c8ca5 0%, #136b87 36%, #063041 100%);
}
.login-page :deep(.account-login) { max-width: 460px; }
</style>
