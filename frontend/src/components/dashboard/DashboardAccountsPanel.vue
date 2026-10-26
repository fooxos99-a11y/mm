<template>
  <section
    class="dashboard-accounts-panel"
    :class="{ 'dashboard-accounts-panel--embedded': embedded }"
    aria-label="الحسابات الإشرافية"
  >
    <header class="dashboard-accounts-panel__heading">
      <h2>الحسابات الحالية ({{ filtered.length }})</h2>
      <AppActionBar v-if="!externalFilters">
        <AppButton
          variant="primary"
          :disabled="busy"
          @click="openCreateDialog"
        >
          إضافة
        </AppButton>
      </AppActionBar>
    </header>
    <AppFilterToolbar
      v-if="!externalFilters"
      :columns="1"
    >
      <AppFilterField
        for-id="account-filter-role"
        label="نوع المسؤول"
      >
        <AppSelect
          id="account-filter-role"
          v-model="localRole"
          :items="roleOptions"
          item-text="label"
          item-value="value"
          hide-details
        />
      </AppFilterField>
    </AppFilterToolbar>
    <div class="dashboard-accounts-panel__summary">
      <span>{{ filtered.length }} من {{ accounts.length }} حساب</span>
      <AppSelect
        id="dashboard-account-sort"
        v-model="sort"
        :items="sortOptions"
        item-text="label"
        item-value="value"
        label="الترتيب"
        hide-details
      />
    </div>
    <div
      v-if="loadError"
      class="permissions-admin__error"
      role="alert"
    >
      <p>{{ loadError }}</p><AppButton
        variant="secondary"
        :disabled="loading"
        @click="loadAccounts"
      >
        إعادة المحاولة
      </AppButton>
    </div>
    <AppTable
      v-if="!loadError || loaded"
      :columns="columns"
      :items="pagedAccounts"
      :loading="loading"
      empty-title="لا توجد حسابات مطابقة"
      empty-description="غيّر نوع المسؤول، أو أضف حسابًا إشرافيًا."
    >
      <template #cell-name="{ item }">
        <div class="dashboard-accounts-panel__copy">
          <strong>{{ item.name }}</strong><bdi dir="auto">{{ item.loginCode }}</bdi><small v-if="item.protectionReason">{{ item.protectionReason }}</small>
        </div>
      </template>
      <template #cell-role="{ item }">
        {{ roleLabel(item.role) }}
      </template>
      <template #cell-status="{ item }">
        <span
          class="dashboard-accounts-panel__status"
          :class="{ 'dashboard-accounts-panel__status--inactive': !item.isActive }"
        >{{ item.isActive ? 'نشط' : 'موقوف' }}</span>
      </template>
      <template #cell-activity="{ item }">
        <div class="dashboard-accounts-panel__copy">
          <small>الإنشاء: {{ accessDate(item.createdAt) }}</small><small>آخر دخول: {{ accessDate(item.lastLoginAt) }}</small>
        </div>
      </template>
      <template #cell-actions="{ item }">
        <AppActionBar class="dashboard-accounts-panel__row-actions">
          <AppButton
            variant="secondary"
            :disabled="busy"
            :aria-label="`تعديل حساب ${item.name}`"
            @click="openEditDialog(item)"
          >
            تعديل
          </AppButton>
          <AppButton
            variant="danger"
            :disabled="busy || item.isProtected"
            :title="item.protectionReason || ''"
            :aria-label="`حذف حساب ${item.name}`"
            @click="requestAction(item, 'delete')"
          >
            حذف
          </AppButton>
        </AppActionBar>
      </template>
    </AppTable>
    <AppPagination
      v-model="page"
      :page-count="pageCount"
    />
    <DashboardAccountEditor
      :open="editorOpen"
      :editing="Boolean(editingAccount)"
      :account-id="editingAccount?.id || ''"
      :protected-account="Boolean(editingAccount?.isProtected)"
      :form="form"
      :roles="roles"
      :submitting="submitting"
      :valid="valid"
      :changed="changed"
      :errors="formErrors"
      :error="formError"
      @change="updateForm"
      @cancel="requestClose"
      @save="submitAccount"
    />
    <DashboardAccountConfirmation
      :action="confirmation"
      :account="confirmingAccount"
      :busy="confirming"
      :error="confirmationError"
      @cancel="confirmation = ''"
      @confirm="confirmAction"
    />
  </section>
</template>
<script src="../../features/dashboardAccounts/dashboardAccountsPanel.js"></script>
<style src="../../styles/components/dashboard-accounts-panel.css"></style>
