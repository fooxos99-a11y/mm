<template>
  <div
    class="permissions-admin"
    :class="{ 'permissions-admin--embedded': embedded }"
  >
    <v-container class="permissions-admin__container py-8 py-md-10">
      <div
        v-if="dashboardError"
        class="permissions-admin__alert permissions-admin__alert--error"
      >
        {{ dashboardError }}
      </div>

      <section class="permissions-admin__panel">
        <article class="permissions-admin__card">
          <div
            v-if="currentUser && currentUser.role === 'admin'"
            class="permissions-admin__section-switcher"
          >
            <AppButton
              variant="plain"
              class="permissions-admin__section-chip"
              :class="{ 'permissions-admin__section-chip--active': activeSection === 'permissions' }"
              @click="activeSection = 'permissions'"
            >
              الصلاحيات
            </AppButton>
            <AppButton
              variant="plain"
              class="permissions-admin__section-chip"
              :class="{ 'permissions-admin__section-chip--active': activeSection === 'supervision' }"
              @click="activeSection = 'supervision'"
            >
              الإشراف
            </AppButton>
          </div>

          <PermissionsMatrixPanel
            v-if="activeSection === 'permissions'"
            :role="selectedRole"
            :roles="roleCards"
            :groups="permissionGroups"
            :saving-key="savingKey"
            :is-enabled="isPermissionEnabled"
            @update:role="selectedRole = $event"
            @change="updatePermission"
          />
          <AdminSupervisionView
            v-else
            embedded
          />
        </article>
      </section>
    </v-container>
  </div>
</template>

<script src="../features/permissions/adminPermissionsView.js"></script>

<style src="../styles/views/admin-permissions.css"></style>
