<template>
  <div
    class="dashboard-accounts-panel"
    :class="{ 'dashboard-accounts-panel--embedded': embedded }"
  >
    <section class="dashboard-accounts-panel__card">
      <div class="dashboard-accounts-panel__block">
        <div class="dashboard-accounts-panel__section-title">
          إضافة حساب إشرافي
        </div>

        <div class="dashboard-accounts-panel__form-grid">
          <div class="dashboard-accounts-panel__field">
            <label
              class="dashboard-accounts-panel__label"
              for="dashboard-account-role"
            >المسمى</label>
            <AppSelect
              id="dashboard-account-role"
              v-model="form.role"
              :items="roleOptions"
              item-text="label"
              item-value="value"
              dense
              outlined
              hide-details
            />
          </div>

          <div class="dashboard-accounts-panel__field">
            <label
              class="dashboard-accounts-panel__label"
              for="dashboard-account-name"
            >الاسم</label>
            <AppTextField
              id="dashboard-account-name"
              v-model.trim="form.name"
              placeholder="الاسم"
              dense
              outlined
              hide-details
            />
          </div>

          <div class="dashboard-accounts-panel__field">
            <label
              class="dashboard-accounts-panel__label"
              for="dashboard-account-login-code"
            >رقم الدخول</label>
            <AppTextField
              id="dashboard-account-login-code"
              v-model.trim="form.loginCode"
              placeholder="رقم الدخول"
              dense
              outlined
              hide-details
            />
          </div>

          <div class="dashboard-accounts-panel__field">
            <label
              class="dashboard-accounts-panel__label"
              for="dashboard-account-password"
            >كلمة المرور</label>
            <AppPasswordField
              id="dashboard-account-password"
              v-model="form.password"
              type="password"
              autocomplete="new-password"
              :placeholder="PASSWORD_REQUIREMENTS_TEXT"
              dense
              outlined
              hide-details
            />
          </div>
        </div>

        <div
          v-if="errorMessage"
          class="dashboard-accounts-panel__error"
          role="alert"
        >
          {{ errorMessage }}
        </div>

        <div class="dashboard-accounts-panel__actions">
          <AppButton
            variant="primary"
            :loading="submitting"
            @click="submitAccount"
          >
            إضافة
          </AppButton>
        </div>
      </div>

      <div class="dashboard-accounts-panel__divider" />

      <div class="dashboard-accounts-panel__block">
        <div class="dashboard-accounts-panel__section-title">
          الحسابات الحالية
        </div>

        <div
          v-if="loading"
          class="dashboard-accounts-panel__empty"
          aria-live="polite"
        >
          جارٍ تحميل الحسابات الإشرافية...
        </div>
        <div
          v-else-if="accounts.length === 0"
          class="dashboard-accounts-panel__empty"
        >
          لا توجد حسابات إشرافية حالياً.
        </div>
        <div
          v-else
          class="dashboard-accounts-panel__stack"
        >
          <article
            v-for="account in accounts"
            :key="account.id"
            class="dashboard-accounts-panel__account"
          >
            <div class="dashboard-accounts-panel__account-copy">
              <div class="dashboard-accounts-panel__account-name">
                {{ account.name }}
              </div>
              <div class="dashboard-accounts-panel__account-meta">
                {{ roleLabel(account.role) }} - {{ account.loginCode }}
              </div>
            </div>

            <AppIconButton
              variant="danger"
              class="dashboard-accounts-panel__delete"
              :label="`حذف حساب ${account.name}`"
              :disabled="deletingId === account.id || currentUser?.id === account.id"
              @click="removeAccount(account.id)"
            >
              <v-icon
                class="app-action-icon app-action-icon--delete"
                aria-hidden="true"
              >
                mdi-delete-outline
              </v-icon>
            </AppIconButton>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { mapActions, mapState } from 'vuex';
import {
  AppButton, AppIconButton, AppPasswordField, AppSelect, AppTextField,
} from '../ui';
import {
  createEmptyDashboardAccountForm,
  DASHBOARD_ACCOUNT_ROLE_OPTIONS,
  dashboardAccountFormIsValid,
  resolveDashboardAccountRoleLabel,
} from '../../features/dashboardAccounts/accountModel.mjs';
import { PASSWORD_REQUIREMENTS_TEXT } from '../../utils/passwordPolicy.mjs';

export default {
  name: 'DashboardAccountsPanel',
  components: {
    AppButton,
    AppIconButton,
    AppPasswordField,
    AppSelect,
    AppTextField,
  },
  props: {
    active: {
      type: Boolean,
      default: true,
    },
    embedded: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['busy-change'],
  data() {
    return {
      PASSWORD_REQUIREMENTS_TEXT,
      accounts: [],
      deletingId: '',
      errorMessage: '',
      form: createEmptyDashboardAccountForm(),
      loaded: false,
      loading: false,
      submitting: false,
    };
  },
  computed: {
    ...mapState(['currentUser']),
    busy() {
      return this.loading || this.submitting || Boolean(this.deletingId);
    },
    roleOptions() {
      return DASHBOARD_ACCOUNT_ROLE_OPTIONS;
    },
  },
  watch: {
    active: {
      immediate: true,
      handler(isActive) {
        if (isActive && !this.loaded && !this.loading) {
          this.loadAccounts();
        }
      },
    },
    busy: {
      immediate: true,
      handler(value) {
        this.$emit('busy-change', value);
      },
    },
  },
  methods: {
    ...mapActions(['fetchDashboardAccounts', 'createDashboardAccount', 'deleteDashboardAccount']),
    roleLabel(role) {
      return resolveDashboardAccountRoleLabel(role);
    },
    async loadAccounts() {
      this.errorMessage = '';
      this.loading = true;

      try {
        this.accounts = await this.fetchDashboardAccounts();
        this.loaded = true;
      } catch (error) {
        this.errorMessage = error?.response?.data?.message || 'تعذر تحميل الحسابات الإشرافية';
      } finally {
        this.loading = false;
      }
    },
    async submitAccount() {
      this.errorMessage = '';

      if (!dashboardAccountFormIsValid(this.form)) {
        this.errorMessage = `أدخل اسمًا من 6 أحرف على الأقل، ورقم الدخول، وكلمة مرور من ${PASSWORD_REQUIREMENTS_TEXT}.`;
        return;
      }

      this.submitting = true;

      try {
        const created = await this.createDashboardAccount({ ...this.form });
        this.accounts = [...this.accounts, created];
        this.form = createEmptyDashboardAccountForm();
        this.$toast.success('تمت إضافة الحساب الإشرافي');
      } catch (error) {
        this.errorMessage = error?.response?.data?.message || 'تعذر إضافة الحساب الإشرافي';
      } finally {
        this.submitting = false;
      }
    },
    async removeAccount(accountId) {
      this.deletingId = accountId;

      try {
        await this.deleteDashboardAccount(accountId);
        this.accounts = this.accounts.filter((account) => account.id !== accountId);
        this.$toast.success('تم حذف الحساب');
      } catch (error) {
        this.$toast.error(error?.response?.data?.message || 'تعذر حذف الحساب');
      } finally {
        this.deletingId = '';
      }
    },
  },
};
</script>

<style scoped src="../../styles/components/dashboard-accounts-panel.css"></style>

