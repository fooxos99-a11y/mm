<template>
  <div
    class="dashboard-page system-management"
    dir="rtl"
  >
    <DashboardSidebar
      :open="menuOpen"
      :items="navigation"
      :active-menu="activeSection"
      :is-active="isActive"
      title="إدارة النظام"
      label="قائمة إدارة النظام"
      navigation-label="أقسام إدارة النظام"
      @close="menuOpen = false"
      @select="selectSection"
    />
    <main class="dashboard-main system-management__main">
      <AppWorkspaceTopbar
        title="إدارة النظام"
        :admin-name="currentUser?.name"
        :menu-open="menuOpen"
        show-account-menu
        :signing-out="signingOut"
        @toggle-menu="menuOpen = !menuOpen"
        @sign-out="signOut"
      >
        <AppActionBar class="dashboard-topbar__actions">
          <AppButton
            v-if="['overview', 'departments'].includes(activeSection)"
            variant="primary"
            class="dashboard-topbar__action"
            :disabled="loading || Boolean(error)"
            @click="openDepartment()"
          >
            إضافة إدارة
          </AppButton>
        </AppActionBar>
      </AppWorkspaceTopbar>
      <AppErrorState
        v-if="error"
        :message="error"
        @retry="load"
      />
      <AppLoadingSpinner
        v-else-if="loading"
        label="جارٍ تحميل الإدارات"
      />
      <div
        v-else
        class="dashboard-workspace-panel system-management__workspace"
      >
        <AppCard
          v-if="activeSection === 'overview'"
          class="admin-workspace-card system-management__summary"
        >
          <div class="system-management__card-heading">
            <h2>ملخص النظام</h2>
          </div>
          <dl
            class="system-management__totals"
            aria-label="ملخص جميع الإدارات"
          >
            <div
              v-for="item in totalCards"
              :key="item.key"
              class="system-management__total"
            >
              <dt>{{ item.label }}</dt><dd>{{ item.value }}</dd>
            </div>
          </dl>
        </AppCard>
        <AppCard
          v-if="activeSection === 'departments'"
          class="admin-workspace-card"
        >
          <div class="system-management__card-heading">
            <h2>الإدارات</h2>
          </div>
          <AppTable
            :columns="columns"
            :items="departments"
            empty-title="لا توجد إدارات"
            empty-description="أضف إدارة وعيّن مسؤولها لتبدأ."
          >
            <template #cell-manager="{ item }">
              <div class="system-management__manager">
                <span>{{ item.manager?.name || 'لم يعيّن مسؤول' }}</span><small
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
              <AppActionBar class="system-management__row-actions">
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
              </AppActionBar>
            </template>
          </AppTable>
        </AppCard>
        <DashboardOverviewPanel
          v-if="['overview', 'indicators'].includes(activeSection)"
          class="system-management__indicators"
          heading-tag="h2"
          :indicators="overviewIndicators"
          :animated-display="animatedIndicatorDisplay"
          :animated-progress="animatedIndicatorPercent"
          :loading="overviewLoading"
          :error="overviewError"
          @retry="loadOverview"
        >
          <template #filter>
            <AppFilterField
              v-if="activeSection === 'indicators'"
              for-id="management-indicator-department"
              label="الإدارة"
              class="system-management__indicator-filter"
            >
              <AppSelect
                id="management-indicator-department"
                v-model="overviewDepartmentId"
                aria-labelledby="management-indicator-department-label"
                :items="filterOptions"
                item-text="label"
                item-value="value"
                hide-details
              />
            </AppFilterField>
          </template>
        </DashboardOverviewPanel>
        <CentralArchivesPanel
          v-if="activeSection === 'archives'"
          :departments="departments"
        />
      </div>
      <AppDialog
        v-model="dialogOpen"
        :persistent="saving"
        max-width="620"
        scrollable
        @close="closeDepartment"
      >
        <form
          class="app-dialog"
          @submit.prevent="submitDepartment"
        >
          <AppDialogHeader
            :title="editingId ? 'تعديل الإدارة' : 'إضافة إدارة'"
            closable
            :close-disabled="saving"
            @close="closeDepartment"
          />
          <AppDialogBody class="system-management__form">
            <fieldset class="system-management__form-group">
              <legend>بيانات الإدارة</legend>
              <AppInput
                v-model.trim="form.name"
                label="اسم الإدارة"
                required
                maxlength="160"
                :error="fieldErrors.name"
              />
              <AppFilterField
                for-id="management-department-status"
                label="حالة الإدارة"
              >
                <AppSelect
                  id="management-department-status"
                  v-model="form.isActive"
                  aria-labelledby="management-department-status-label"
                  :items="statusOptions"
                  item-text="label"
                  item-value="value"
                  hide-details
                  :error-messages="fieldErrors.isActive"
                />
              </AppFilterField>
            </fieldset>
            <fieldset class="system-management__form-group">
              <legend>حساب مسؤول الإدارة</legend>
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
                required
                maxlength="100"
                :error="fieldErrors.managerLoginCode"
                @update:model-value="form.managerPassword = ''"
              />
              <AppFilterField
                v-if="needsManagerPassword"
                for-id="management-manager-password"
                label="كلمة المرور"
              >
                <AppPasswordField
                  id="management-manager-password"
                  v-model="form.managerPassword"
                  aria-labelledby="management-manager-password-label"
                  autocomplete="new-password"
                  :error-messages="managerPasswordError"
                  hide-details="auto"
                  required
                />
              </AppFilterField>
            </fieldset>
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
              :disabled="!canSaveDepartment"
            >
              حفظ
            </AppButton>
            <AppButton
              variant="secondary"
              :disabled="saving"
              @click="closeDepartment"
            >
              إلغاء
            </AppButton>
          </AppDialogFooter>
        </form>
      </AppDialog>
    </main>
  </div>
</template>
<script src="../features/departments/systemManagementView.js"></script>
<style src="../styles/views/dashboard.css"></style>
<style src="../styles/views/dashboard-management.css"></style>
<style src="../styles/views/dashboard-responsive.css"></style>
<style src="../styles/views/admin-workspace.css"></style>
<style scoped src="../styles/views/system-management.css"></style>
