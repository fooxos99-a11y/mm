<template>
  <div
    class="system-management"
    dir="rtl"
  >
    <AppMobileSidebar
      :open="menuOpen"
      label="قائمة إدارة النظام"
      @close="menuOpen = false"
    >
      <router-link
        :to="{ name: 'practitioner' }"
        class="system-management__brand"
      >
        <span class="system-management__brand-mark"><v-icon>mdi-shield-account-outline</v-icon></span>
        <span>ممارس<small>لوحة المدير العام</small></span>
      </router-link>
      <nav
        class="system-management__navigation"
        aria-label="أقسام إدارة النظام"
      >
        <AppButton
          v-for="item in navigation"
          :key="item.id"
          variant="plain"
          :class="{ 'is-active': activeSection === item.id }"
          :aria-current="activeSection === item.id ? 'page' : null"
          @click="selectSection(item.id)"
        >
          <v-icon size="20">
            {{ item.icon }}
          </v-icon>{{ item.label }}
        </AppButton>
      </nav>
      <div class="system-management__sidebar-account">
        <span class="system-management__avatar">{{ currentUser?.name?.charAt(0) }}</span>
        <div><strong>{{ currentUser?.name }}</strong><small>المدير العام</small></div>
      </div>
    </AppMobileSidebar>
    <main class="system-management__main">
      <header class="system-management__header">
        <AppIconButton
          class="system-management__menu-toggle"
          variant="secondary"
          aria-label="فتح القائمة"
          @click="menuOpen = true"
        >
          <v-icon>mdi-menu</v-icon>
        </AppIconButton>
        <div>
          <p class="system-management__eyebrow">
            {{ navigation.find(item => item.id === activeSection)?.label }}
          </p>
          <h1>إدارة النظام</h1>
        </div>
        <div class="system-management__actions">
          <AppButton
            variant="primary"
            @click="openDepartment()"
          >
            إضافة إدارة
          </AppButton>
          <AppButton
            variant="secondary"
            @click="signOut"
          >
            تسجيل الخروج
          </AppButton>
        </div>
      </header>
      <AppErrorState
        v-if="error"
        :message="error"
        @retry="load"
      />
      <AppLoadingSpinner
        v-else-if="loading"
        label="جارٍ تحميل الإدارات"
      />
      <template v-else>
        <section
          v-if="activeSection === 'overview'"
          class="system-management__totals"
          aria-label="ملخص النظام"
        >
          <AppCard
            v-for="item in totalCards"
            :key="item.key"
            class="system-management__summary-card"
          >
            <span>{{ item.label }}</span>
            <strong class="system-management__number">{{ item.value }}</strong>
            <span class="system-management__summary-icon"><v-icon>{{ item.icon }}</v-icon></span>
          </AppCard>
        </section>
        <AppCard
          v-if="['overview', 'departments'].includes(activeSection)"
          title="الإدارات"
        >
          <AppTable
            :columns="columns"
            :items="departments"
            empty-title="لا توجد إدارات"
            empty-description="أضف إدارة وعيّن مسؤولها لتبدأ."
          >
            <template #cell-manager="{ item }">
              <div class="system-management__manager">
                <span>{{ item.manager?.name || 'لم يعيّن مسؤول' }}</span>
                <small
                  v-if="item.manager"
                  class="system-management__meta"
                >{{ item.managerTitle }} · <bdi>{{ item.manager.loginCode }}</bdi></small>
              </div>
            </template>
            <template #cell-status="{ item }">
              <span
                class="system-management__status"
                :class="{ 'is-paused': item.isActive === false }"
              >{{ item.isActive === false ? 'موقوفة' : 'نشطة' }}</span>
            </template>
            <template #cell-actions="{ item }">
              <div class="system-management__actions">
                <AppButton
                  variant="secondary"
                  :aria-label="`تعديل ${item.name}`"
                  @click="openDepartment(item)"
                >
                  تعديل
                </AppButton>
                <AppButton
                  variant="primary"
                  :loading="entering === item.id"
                  :disabled="Boolean(entering) || item.isActive === false"
                  :aria-label="`فتح ${item.name}`"
                  @click="enterDepartment(item)"
                >
                  فتح الإدارة
                </AppButton>
              </div>
            </template>
          </AppTable>
        </AppCard>
        <AppCard
          v-if="['overview', 'indicators'].includes(activeSection)"
          title="مؤشرات الأداء"
        >
          <AppSelect
            v-model="overviewDepartmentId"
            label="الإدارة"
            :items="filterOptions"
            item-text="label"
            item-value="value"
            @update:model-value="loadOverview"
          />
          <AppErrorState
            v-if="overviewError"
            :message="overviewError"
            @retry="loadOverview"
          />
          <AppLoadingSpinner v-else-if="overviewLoading" />
          <div
            v-if="!overviewLoading && !overviewError"
            class="system-management__indicators"
          >
            <div
              v-for="indicator in overviewIndicators"
              :key="indicator.key"
              class="system-management__indicator"
              :aria-label="`${indicator.label}: ${indicator.display}، ${indicator.meta}`"
            >
              <AppIndicatorRing
                :progress="indicator.progress"
                :display="indicator.display"
              />
              <div><strong>{{ indicator.label }}</strong><small>{{ indicator.meta }}</small></div>
            </div>
          </div>
        </AppCard>
        <CentralArchivesPanel
          v-if="activeSection === 'archives'"
          :departments="departments"
        />
      </template>
    </main>
    <AppDialog
      v-model="dialogOpen"
      :persistent="saving"
      max-width="620"
      scrollable
      @close="form.managerPassword = ''"
    >
      <form
        class="app-dialog"
        @submit.prevent="submitDepartment"
      >
        <AppDialogHeader
          :title="editingId ? 'تعديل الإدارة' : 'إضافة إدارة'"
          closable
          :close-disabled="saving"
          @close="dialogOpen = false"
        />
        <AppDialogBody class="system-management__form">
          <AppInput
            v-model.trim="form.name"
            label="اسم الإدارة"
            required
            maxlength="160"
            :error="fieldErrors.name"
          />
          <AppInput
            v-model.trim="form.managerTitle"
            label="مسمى المسؤول"
            required
            maxlength="100"
            :error="fieldErrors.managerTitle"
          />
          <AppInput
            v-model.trim="form.managerLoginCode"
            label="رقم الدخول"
            autocomplete="off"
            inputmode="numeric"
            required
            maxlength="100"
            :error="fieldErrors.managerLoginCode"
            @update:model-value="form.managerPassword = ''"
          />
          <AppPasswordField
            v-if="needsManagerPassword"
            v-model="form.managerPassword"
            label="رمز الدخول"
            autocomplete="new-password"
            inputmode="numeric"
            :error-messages="managerPasswordError"
            hide-details="auto"
            required
          />
          <AppSelect
            v-model="form.isActive"
            label="حالة الإدارة"
            :items="statusOptions"
            item-text="label"
            item-value="value"
          />
          <p
            v-if="saveError"
            role="alert"
            class="system-management__error"
          >
            {{ saveError }}
          </p>
        </AppDialogBody>
        <AppDialogFooter>
          <AppButton
            native-type="submit"
            variant="primary"
            :loading="saving"
            :disabled="!formValid"
          >
            حفظ الإدارة
          </AppButton>
          <AppButton
            variant="secondary"
            :disabled="saving"
            @click="dialogOpen = false"
          >
            إلغاء
          </AppButton>
        </AppDialogFooter>
      </form>
    </AppDialog>
  </div>
</template>
<script>
import { mapState } from 'vuex';
import { AppButton, AppCard, AppDialog, AppDialogBody, AppDialogFooter, AppDialogHeader, AppErrorState, AppIconButton, AppIndicatorRing, AppInput, AppLoadingSpinner, AppPasswordField, AppSelect, AppTable } from '../components/ui';
import AppMobileSidebar from '../components/ui/AppMobileSidebar.vue';
import CentralArchivesPanel from '../components/departments/CentralArchivesPanel.vue';
import { fetchDepartments, fetchManagementOverview, saveDepartment } from '../services/managementApi';
import { createDepartmentForm, departmentFormIsValid } from '../features/departments/departmentModel.mjs';
import { passwordMeetsPolicy } from '../utils/passwordPolicy.mjs';
const totals = (values = {}) => [
  { key: 'departments', label: 'الإدارات', icon: 'mdi-bookshelf', value: values.departments ?? 0 },
  { key: 'users', label: 'الحسابات', icon: 'mdi-account-group-outline', value: values.users ?? 0 },
  { key: 'students', label: 'المعلمون والمعلمات', icon: 'mdi-school-outline', value: values.students ?? 0 },
  { key: 'courses', label: 'الدورات', icon: 'mdi-book-open-page-variant-outline', value: values.courses ?? 0 },
  { key: 'archives', label: 'الدفعات المؤرشفة', icon: 'mdi-archive-outline', value: values.archives ?? 0 },
];
export default {
  name: 'SystemManagementView',
  components: { AppButton, AppCard, AppDialog, AppDialogBody, AppDialogFooter, AppDialogHeader, AppErrorState, AppIconButton, AppIndicatorRing, AppInput, AppLoadingSpinner, AppPasswordField, AppSelect, AppTable, AppMobileSidebar, CentralArchivesPanel },
  data: () => ({
    activeSection: 'overview', menuOpen: false,
    navigation: [
      { id: 'overview', label: 'نظرة عامة', icon: 'mdi-view-dashboard-outline' },
      { id: 'departments', label: 'الإدارات', icon: 'mdi-bookshelf' },
      { id: 'indicators', label: 'مؤشرات الأداء', icon: 'mdi-chart-box-outline' },
      { id: 'archives', label: 'الأرشيف المركزي', icon: 'mdi-archive-outline' },
    ],
    departments: [], loading: false, error: '', overview: {}, overallTotals: {}, overviewDepartmentId: '', overviewLoading: false, overviewError: '',
    dialogOpen: false, editingId: null, form: createDepartmentForm(), originalManagerLoginCode: '', saving: false, saveError: '', fieldErrors: {}, entering: '', overviewGeneration: 0,
    columns: [{ key: 'name', label: 'الإدارة' }, { key: 'manager', label: 'المسؤول' }, { key: 'status', label: 'الحالة' }, { key: 'actions', label: 'الإجراءات' }],
    statusOptions: [{ label: 'نشطة', value: true }, { label: 'موقوفة', value: false }],
  }),
  computed: {
    ...mapState(['currentUser']),
    totalCards() { return totals(this.overallTotals); },
    selectedOverview() { return this.overviewDepartmentId ? this.overview?.departments?.find(d => String(d.id) === String(this.overviewDepartmentId)) : this.overview; },
    overviewIndicators() { return this.selectedOverview?.indicators || []; },
    filterOptions() { return [{ label: 'جميع الإدارات', value: '' }, ...this.departments.map(d => ({ label: d.name, value: d.id }))]; },
    needsManagerPassword() { return !this.originalManagerLoginCode || this.form.managerLoginCode !== this.originalManagerLoginCode; },
    managerPasswordError() { return this.fieldErrors.managerPassword || (this.form.managerPassword && !passwordMeetsPolicy(this.form.managerPassword) ? 'الرمز يجب أن يتكوّن من 8 أرقام.' : ''); },
    formValid() { return departmentFormIsValid(this.form, this.originalManagerLoginCode); },
  },
  created() { this.load(); },
  methods: {
    selectSection(id) { this.activeSection = id; this.menuOpen = false; },
    async load() {
      this.loading = true; this.error = '';
      try {
        const [payload, overview] = await Promise.all([fetchDepartments(), fetchManagementOverview()]);
        this.departments = payload?.departments || payload || [];
        this.overallTotals = overview?.totals || {};
        this.overview = overview;
      } catch (error) { this.error = error?.response?.data?.message || 'تعذر تحميل الإدارات. حاول مرة أخرى.'; }
      finally { this.loading = false; }
    },
    openDepartment(department) {
      this.editingId = department?.id || null;
      this.form = createDepartmentForm(department);
      this.originalManagerLoginCode = department?.manager?.loginCode || '';
      this.saveError = ''; this.fieldErrors = {}; this.dialogOpen = true;
    },
    async submitDepartment() {
      if (!this.formValid || this.saving) return;
      this.saving = true; this.saveError = ''; this.fieldErrors = {};
      try {
        await saveDepartment(this.editingId, { ...this.form, managerPassword: this.needsManagerPassword ? this.form.managerPassword : undefined });
        this.form.managerPassword = '';
        this.dialogOpen = false;
        this.$toast.success('حُفظت الإدارة.');
        await this.load();
      } catch (error) {
        this.saveError = error?.response?.data?.message || 'تعذر حفظ الإدارة.';
        this.fieldErrors = Object.fromEntries(Object.entries(error?.response?.data?.errors || {}).map(([key, value]) => [key, value[0]]));
      } finally { this.saving = false; }
    },
    async enterDepartment(department) {
      this.entering = department.id;
      try { await this.$store.dispatch('selectDepartmentContext', department.id); await this.$router.push({ name: 'dashboard' }); }
      catch (error) { this.$toast.error(error?.response?.data?.message || 'تعذر فتح الإدارة.'); }
      finally { this.entering = ''; }
    },
    async loadOverview() {
      const generation = ++this.overviewGeneration;
      this.overviewLoading = true; this.overviewError = '';
      try { const overview = await fetchManagementOverview(this.overviewDepartmentId); if (generation === this.overviewGeneration) this.overview = overview; }
      catch (error) { if (generation === this.overviewGeneration) this.overviewError = error?.response?.data?.message || 'تعذر تحميل المؤشرات.'; }
      finally { if (generation === this.overviewGeneration) this.overviewLoading = false; }
    },
    async signOut() { await this.$store.dispatch('logout'); await this.$router.replace({ name: 'login' }); },
  },
};
</script>
<style scoped src="../styles/views/system-management.css"></style>
