<template>
  <main
    class="system-management"
    dir="rtl"
  >
    <header class="system-management__header">
      <div>
        <p class="system-management__eyebrow">
          المدير العام
        </p>
        <h1>إدارة النظام</h1>
        <p>مرحبًا {{ currentUser?.name }}</p>
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
        class="system-management__totals"
        aria-label="ملخص النظام"
      >
        <AppCard
          v-for="item in totalCards"
          :key="item.key"
          :title="item.label"
        >
          <strong class="system-management__number">{{ item.value }}</strong>
        </AppCard>
      </section>
      <AppCard title="الإدارات">
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
            {{ item.isActive === false ? 'موقوفة' : 'نشطة' }}
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
      <AppCard title="المؤشرات العامة">
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
          v-else
          class="system-management__totals"
        >
          <div
            v-for="item in overviewCards"
            :key="item.key"
          >
            <span>{{ item.label }}</span><strong class="system-management__number">{{ item.value }}</strong>
          </div>
        </div>
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
            <strong>{{ indicator.label }}</strong>
            <small>{{ indicator.meta }}</small>
          </div>
        </div>
      </AppCard>
      <CentralArchivesPanel :departments="departments" />
    </template>
    <AppDialog
      v-model="dialogOpen"
      :persistent="saving"
      max-width="620"
    >
      <form @submit.prevent="submitDepartment">
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
            maxlength="120"
            :error="fieldErrors.managerTitle"
            hint="مثل مدير التدريب أو مدير النمو المهني"
          />
          <div class="system-management__lookup">
            <AppInput
              v-model.trim="form.managerLoginCode"
              label="رقم دخول المسؤول"
              autocomplete="off"
              inputmode="numeric"
              required
              :error="fieldErrors.managerLoginCode"
              hint="أدخل رقم حساب مسجّل في الموقع"
              @update:model-value="clearAccountLookup"
            />
            <AppButton
              variant="secondary"
              :loading="lookingUp"
              :disabled="!form.managerLoginCode || saving"
              @click="lookupAccount"
            >
              التحقق من الحساب
            </AppButton>
          </div>
          <p
            v-if="candidate"
            class="system-management__account"
            role="status"
          >
            {{ candidate.name }} · <bdi>{{ candidate.loginCode }}</bdi>
            <span v-if="!candidateAllowed">الحساب مرتبط بإدارة أخرى، أو لا يمكن تعيينه مسؤولًا.</span>
          </p>
          <p
            v-if="lookupError"
            role="alert"
            class="system-management__error"
          >
            {{ lookupError }}
          </p>
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
  </main>
</template>
<script>
import { mapState } from 'vuex';
import { AppButton, AppCard, AppDialog, AppDialogBody, AppDialogFooter, AppDialogHeader, AppErrorState, AppIndicatorRing, AppInput, AppLoadingSpinner, AppSelect, AppTable } from '../components/ui';
import CentralArchivesPanel from '../components/departments/CentralArchivesPanel.vue';
import { fetchDepartments, fetchManagementOverview, lookupManagementAccount, saveDepartment } from '../services/managementApi';
import { canAssignDepartmentAccount, createDepartmentForm, departmentFormIsValid } from '../features/departments/departmentModel.mjs';
const totals = (values = {}) => [
  { key: 'departments', label: 'الإدارات', value: values.departments ?? 0 },
  { key: 'users', label: 'الحسابات', value: values.users ?? 0 },
  { key: 'students', label: 'المعلمون والمعلمات', value: values.students ?? 0 },
  { key: 'courses', label: 'الدورات', value: values.courses ?? 0 },
  { key: 'archives', label: 'الدفعات المؤرشفة', value: values.archives ?? 0 },
];
export default {
  name: 'SystemManagementView',
  components: { AppButton, AppCard, AppDialog, AppDialogBody, AppDialogFooter, AppDialogHeader, AppErrorState, AppIndicatorRing, AppInput, AppLoadingSpinner, AppSelect, AppTable, CentralArchivesPanel },
  data: () => ({
    departments: [], loading: false, error: '', overview: {}, overallTotals: {}, overviewDepartmentId: '', overviewLoading: false, overviewError: '',
    dialogOpen: false, editingId: null, form: createDepartmentForm(), candidate: null, lookingUp: false, lookupError: '', saving: false, saveError: '', fieldErrors: {}, entering: '', lookupGeneration: 0, overviewGeneration: 0,
    columns: [{ key: 'name', label: 'الإدارة' }, { key: 'manager', label: 'المسؤول' }, { key: 'status', label: 'الحالة' }, { key: 'actions', label: 'الإجراءات' }],
    statusOptions: [{ label: 'نشطة', value: true }, { label: 'موقوفة', value: false }],
  }),
  computed: {
    ...mapState(['currentUser']),
    totalCards() { return totals(this.overallTotals); },
    selectedOverview() { return this.overviewDepartmentId ? this.overview?.departments?.find(d => String(d.id) === String(this.overviewDepartmentId)) : this.overview; },
    overviewCards() { return totals(this.overviewDepartmentId ? { ...this.selectedOverview?.counts, departments: this.selectedOverview ? 1 : 0 } : this.overview?.totals); },
    overviewIndicators() { return this.selectedOverview?.indicators || []; },
    filterOptions() { return [{ label: 'جميع الإدارات', value: '' }, ...this.departments.map(d => ({ label: d.name, value: d.id }))]; },
    candidateAllowed() { return canAssignDepartmentAccount(this.candidate, this.editingId); },
    formValid() { return departmentFormIsValid(this.form, this.candidate, this.editingId); },
  },
  created() { this.load(); },
  methods: {
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
      this.candidate = department?.manager ? { ...department.manager, role: 'admin', departmentId: department.id } : null;
      this.saveError = ''; this.fieldErrors = {}; this.lookupError = ''; this.dialogOpen = true;
      this.lookupGeneration += 1;
    },
    clearAccountLookup() { this.lookupGeneration += 1; this.candidate = null; this.lookupError = ''; },
    async lookupAccount() {
      const generation = ++this.lookupGeneration;
      this.lookingUp = true; this.lookupError = ''; this.candidate = null;
      try {
        const payload = await lookupManagementAccount(this.form.managerLoginCode);
        if (generation !== this.lookupGeneration) return;
        this.candidate = payload?.accounts?.[0] || payload?.account || (Array.isArray(payload) ? payload[0] : null);
        if (!this.candidate) this.lookupError = 'لم نجد حسابًا بهذا الرقم. اطلب من المسؤول إنشاء حساب أولًا.';
      } catch (error) { if (generation === this.lookupGeneration) this.lookupError = error?.response?.data?.message || 'تعذر التحقق من الحساب.'; }
      finally { this.lookingUp = false; }
    },
    async submitDepartment() {
      if (!this.formValid || this.saving) return;
      this.saving = true; this.saveError = ''; this.fieldErrors = {};
      try {
        await saveDepartment(this.editingId, this.form);
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
