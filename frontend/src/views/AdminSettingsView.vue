<template>
  <div
    class="settings-admin"
    :class="{ 'settings-admin--embedded': embedded }"
  >
    <v-container class="settings-admin__container py-8 py-md-10">
      <section class="settings-admin__shell">
        <aside
          v-if="!hideSidebar"
          class="settings-admin__sidebar"
        >
          <div class="settings-admin__sidebar-title">
            الإعدادات
          </div>

          <AppButton
            v-for="item in items"
            :key="item.id"
            variant="plain"
            class="settings-admin__nav-item"
            :class="{ 'settings-admin__nav-item--active': selectedItemId === item.id }"
            @click="handleItemClick(item)"
          >
            {{ item.label }}
          </AppButton>
        </aside>

        <section class="settings-admin__content">
          <template v-if="selectedItem && selectedPanelComponent">
            <div
              v-if="selectedItemActions.length"
              class="settings-admin__actions settings-admin__actions--panel"
            >
              <AppButton
                v-for="action in selectedItemActions"
                :key="action.id"
                :variant="action.variant"
                @click="runSelectedItemAction(action.id)"
              >
                {{ action.label }}
              </AppButton>
            </div>

            <div class="settings-admin__panel-shell">
              <component
                :is="selectedPanelComponent"
                ref="selectedPanel"
                v-bind="selectedPanelProps"
                @permissions-topbar-state="$emit('permissions-topbar-state', $event)"
                @registration-topbar-state="$emit('registration-topbar-state', $event)"
              />
            </div>
          </template>
        </section>
      </section>
    </v-container>
  </div>
</template>

<script>
import { AppButton } from '../components/ui';
import AdminArchiveView from './AdminArchiveView.vue';
import AdminHomePageSettingsView from './AdminHomePageSettingsView.vue';
import AdminPeopleView from './AdminPeopleView.vue';
import AdminPermissionsView from './AdminPermissionsView.vue';
import AdminRegistrationView from './AdminRegistrationView.vue';
import AdminTemplatesView from './AdminTemplatesView.vue';

export default {
  name: 'AdminSettingsView',
  components: {
    AppButton,
    AdminArchiveView,
    AdminHomePageSettingsView,
    AdminPeopleView,
    AdminPermissionsView,
    AdminRegistrationView,
    AdminTemplatesView,
  },
  props: {
    embedded: {
      type: Boolean,
      default: false,
    },
    activeItemId: {
      type: String,
      default: '',
    },
    hideSidebar: {
      type: Boolean,
      default: false,
    },
    items: {
      type: Array,
      default: () => [],
    },
  },
  emits: ['permissions-topbar-state', 'registration-topbar-state'],
  data() {
    return {
      selectedItemId: '',
    };
  },
  computed: {
    resolvedSelectedItemId() {
      return this.activeItemId || this.selectedItemId;
    },
    selectedItem() {
      return this.items.find((item) => item.id === this.resolvedSelectedItemId) || this.items[0] || null;
    },
    selectedPanelComponent() {
      switch (this.selectedItem?.id) {
        case 'home':
          return AdminHomePageSettingsView;
        case 'permissions':
          return AdminPermissionsView;
        case 'archive':
          return AdminArchiveView;
        case 'registration':
          return AdminRegistrationView;
        case 'users':
          return AdminPeopleView;
        case 'templates':
          return AdminTemplatesView;
        default:
          return null;
      }
    },
    selectedPanelProps() {
      return { embedded: true };
    },
    selectedItemActions() {
      if (this.selectedItem?.id === 'users') {
        return [
          { id: 'edit', label: 'تعديل', variant: 'secondary' },
          { id: 'create', label: 'إضافة', variant: 'primary' },
        ];
      }

      return [];
    },
  },
  watch: {
    activeItemId: {
      immediate: true,
      handler(nextValue) {
        if (nextValue && this.items.some((item) => item.id === nextValue)) {
          this.selectedItemId = nextValue;
        }
      },
    },
    items: {
      immediate: true,
      handler(nextItems) {
        if (!nextItems.length) {
          this.selectedItemId = '';
          return;
        }

        if (!nextItems.some((item) => item.id === this.selectedItemId)) {
          this.selectedItemId = nextItems[0].id;
        }
      },
    },
  },
  methods: {
    openCreateDialog() {
      this.$refs.selectedPanel?.openCreateDialog?.();
    },
    openArchiveAllDialog() {
      this.$refs.selectedPanel?.openArchiveAllDialog?.();
    },
    copyRegistrationLink() {
      this.$refs.selectedPanel?.copyRegistrationLink?.();
    },
    toggleRegistration() {
      this.$refs.selectedPanel?.toggleRegistration?.();
    },
    openFieldsDialog() {
      this.$refs.selectedPanel?.openFieldsDialog?.();
    },
    togglePermissionsWorkspaceSection() {
      this.$refs.selectedPanel?.toggleTopbarSection?.();
    },
    handleItemClick(item) {
      this.selectedItemId = item.id;
    },
    runSelectedItemAction(actionId) {
      const panel = this.$refs.selectedPanel;

      if (this.selectedItem?.id === 'users') {
        if (actionId === 'create') {
          panel?.openCreateDialog?.();
          return;
        }

        if (actionId === 'edit') {
          panel?.openEditDialog?.();
        }

        return;
      }

      if (this.selectedItem?.id === 'archive') {
        if (actionId === 'create') {
          panel?.openCreateDialog?.();
          return;
        }

        if (actionId === 'archive-all') {
          panel?.openArchiveAllDialog?.();
        }
      }
    },
  },
};
</script>

<style scoped src="../styles/views/admin-settings-shell.css"></style>

