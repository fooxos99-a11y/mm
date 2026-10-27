<template>
  <div
    class="permissions-admin"
    :class="{ 'permissions-admin--embedded': embedded }"
  >
    <AppSettingsPanel
      title="الإشراف"
      class="permissions-admin__card"
    >
      <template #actions>
        <AppActionBar v-if="activeSection === 'supervision'">
          <AppButton
            variant="primary"
            :disabled="accountsBusy"
            @click="$refs.accounts.openCreateDialog()"
          >
            إضافة
          </AppButton>
        </AppActionBar>
      </template>
      <template #filters>
        <AppFilterField
          for-id="permissions-section"
          label="القسم"
        >
          <AppSelect
            id="permissions-section"
            :value="activeSection"
            :items="sectionOptions"
            item-text="label"
            item-value="value"
            :disabled="accountsBusy"
            hide-details
            @input="setSection"
          />
        </AppFilterField>
        <AppFilterField
          for-id="permissions-manager-role"
          label="نوع المسؤول"
        >
          <AppSelect
            id="permissions-manager-role"
            :value="accountRole"
            :items="roleOptions"
            item-text="label"
            item-value="value"
            :disabled="accountsBusy || activeSection === 'history'"
            hide-details
            @input="setRole"
          />
        </AppFilterField>
      </template>
      <DashboardAccountsPanel
        v-show="activeSection === 'supervision'"
        ref="accounts"
        embedded
        external-filters
        :active="activeSection === 'supervision'"
        :role-filter="accountRole"
        @busy-change="accountsBusy = $event"
        @dirty-change="accountsDirty = $event"
        @changed="loadHistory"
      />
      <AccessHistoryPanel
        v-if="activeSection === 'history'"
        :items="history"
        :loading="historyLoading"
        :error="historyError"
        @reload="loadHistory"
      />
    </AppSettingsPanel>
    <AppDialog
      v-model="leaveDialog"
      :persistent="true"
      max-width="480"
    >
      <DialogShell title="تعديلات غير محفوظة">
        <p>ستفقد التعديلات التي لم تحفظها إذا غادرت الصفحة.</p>
        <template #actions>
          <AppButton
            variant="secondary"
            @click="continueEditing"
          >
            متابعة التعديل
          </AppButton>
          <AppButton
            variant="danger"
            @click="discardAndLeave"
          >
            مغادرة دون حفظ
          </AppButton>
        </template>
      </DialogShell>
    </AppDialog>
  </div>
</template>
<script src="../features/permissions/adminPermissionsView.js"></script>
<style src="../styles/views/admin-permissions.css"></style>
