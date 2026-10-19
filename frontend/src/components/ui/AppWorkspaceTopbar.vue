<template>
  <header class="dashboard-topbar">
    <div class="dashboard-topbar__mobile">
      <AppIconButton
        variant="plain"
        class="dashboard-icon-button"
        aria-label="فتح القائمة"
        :aria-expanded="menuOpen"
        @click="$emit('toggle-menu')"
      >
        <v-icon>mdi-menu</v-icon>
      </AppIconButton>
    </div>
    <div
      class="dashboard-topbar__welcome"
      :class="{ 'dashboard-topbar__welcome--account': showAccountMenu }"
    >
      <component
        :is="title ? 'h1' : 'div'"
        class="dashboard-topbar__label"
      >
        {{ title || 'مرحبًا' }}
      </component>
      <v-menu
        v-if="showAccountMenu"
        location="bottom end"
        content-class="app-dropdown-menu"
        :close-on-content-click="!signingOut"
      >
        <template #activator="{ props }">
          <AppButton
            variant="plain"
            class="dashboard-topbar__profile"
            :aria-label="`قائمة حساب ${adminName}`"
            :disabled="signingOut"
            v-bind="props"
          >
            <v-icon aria-hidden="true">
              mdi-account-circle-outline
            </v-icon>
            <span class="dashboard-topbar__name">{{ adminName }}</span>
            <v-icon
              class="dashboard-topbar__profile-chevron"
              aria-hidden="true"
            >
              mdi-chevron-down
            </v-icon>
          </AppButton>
        </template>
        <div
          class="workspace-account-menu"
          dir="rtl"
        >
          <div class="workspace-account-menu__name">
            {{ adminName }}
          </div>
          <AppButton
            variant="plain"
            class="workspace-account-menu__logout"
            :loading="signingOut"
            @click="$emit('sign-out')"
          >
            <v-icon aria-hidden="true">
              mdi-logout
            </v-icon>
            تسجيل الخروج
          </AppButton>
        </div>
      </v-menu>
      <div
        v-else
        class="dashboard-topbar__name"
      >
        {{ adminName }}
      </div>
    </div>
    <slot />
  </header>
</template>

<script>
import AppIconButton from './AppIconButton.vue';
import AppButton from './AppButton.vue';

export default {
  name: 'AppWorkspaceTopbar',
  components: { AppButton, AppIconButton },
  props: {
    adminName: { type: String, default: '' },
    title: { type: String, default: '' },
    menuOpen: Boolean,
    showAccountMenu: Boolean,
    signingOut: Boolean,
  },
  emits: ['toggle-menu', 'sign-out'],
};
</script>

<style scoped>
.dashboard-topbar__label { margin: 0; }
.dashboard-topbar .dashboard-topbar__welcome--account { display: block; min-width: 0; }
.dashboard-topbar__profile { min-width: var(--app-control-height); min-height: var(--app-control-height); padding-inline: 0; color: var(--app-primary); }
.dashboard-topbar__profile :deep(.app-button__content),
.workspace-account-menu__logout :deep(.app-button__content) { display: flex; align-items: center; gap: 8px; }
.dashboard-topbar__profile .dashboard-topbar__name { margin: 0; }
.dashboard-topbar__profile:focus-visible { outline: 2px solid var(--app-primary); outline-offset: 3px; }
.workspace-account-menu { min-width: 220px; max-width: calc(100vw - 32px); padding: 8px; background: var(--app-surface); }
.workspace-account-menu__name { padding: 8px 12px 12px; border-bottom: 1px solid var(--app-border); color: var(--app-ui-text); font-size: var(--app-font-sm); overflow-wrap: anywhere; }
.workspace-account-menu__logout { width: 100%; min-height: var(--app-control-height); justify-content: flex-start; padding: 8px 12px; margin-top: 4px; color: var(--app-danger); }
.workspace-account-menu__logout:hover { background: var(--app-danger-soft); }
@media (max-width: 700px) {
  .dashboard-topbar__welcome--account > .dashboard-topbar__label,
  .dashboard-topbar__profile .dashboard-topbar__name,
  .dashboard-topbar__profile-chevron { display: none; }
  .dashboard-topbar__profile { padding-inline: 8px; }
}
</style>
