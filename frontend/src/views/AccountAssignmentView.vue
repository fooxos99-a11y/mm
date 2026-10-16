<template>
  <main
    class="account-entry"
    dir="rtl"
  >
    <AppCard title="بانتظار تعيين الإدارة">
      <p>مرحبًا {{ currentUser?.name }}، حسابك جاهز.</p>
      <p>أعطِ رقم الدخول للمدير العام لربط حسابك بإدارة.</p>
      <p class="account-entry__code">
        رقم الدخول: <bdi>{{ currentUser?.loginCode }}</bdi>
      </p>
      <p
        v-if="error"
        role="alert"
        class="account-entry__error"
      >
        {{ error }}
      </p>
      <div class="account-entry__form">
        <AppButton
          variant="primary"
          :loading="loading"
          @click="refresh"
        >
          التحقق من التعيين
        </AppButton>
        <AppButton
          variant="secondary"
          @click="signOut"
        >
          تسجيل الخروج
        </AppButton>
      </div>
    </AppCard>
  </main>
</template>
<script>
import { mapState } from 'vuex';
import { AppButton, AppCard } from '../components/ui';
import { fetchCurrentUser } from '../services/authApi';
import { resolveUserHomeRoute } from '../utils/authRoutes';
export default {
  name: 'AccountAssignmentView',
  components: { AppButton, AppCard },
  data: () => ({ loading: false, error: '' }),
  computed: { ...mapState(['currentUser']) },
  methods: {
    async refresh() {
      this.loading = true;
      this.error = '';
      try {
        const user = await fetchCurrentUser();
        this.$store.commit('setAuthState', { user });
        if (user?.role !== 'unassigned') await this.$router.replace(resolveUserHomeRoute(user));
        else this.$toast.info('حسابك بانتظار تعيين الإدارة.');
      } catch (error) {
        if (error?.response?.status === 401) {
          await this.$store.dispatch('logout');
          this.$toast.info('سجّل الدخول مرة أخرى للتحقق من تعيين الإدارة.');
          await this.$router.replace({ name: 'login' });
        } else this.error = error?.response?.data?.message || 'تعذر التحقق من التعيين.';
      }
      finally { this.loading = false; }
    },
    async signOut() { await this.$store.dispatch('logout'); await this.$router.replace({ name: 'login' }); },
  },
};
</script>
<style scoped src="../styles/views/account-entry.css"></style>
