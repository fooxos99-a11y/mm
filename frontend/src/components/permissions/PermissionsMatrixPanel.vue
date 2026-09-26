<template>
  <div>
    <div class="permissions-admin__role-switcher">
      <div class="permissions-admin__role-field">
        <label
          for="permissions-manager-role"
          class="permissions-admin__role-label"
        >
          نوع المسؤول
        </label>
        <AppNativeSelect
          id="permissions-manager-role"
          :value="role"
          class="permissions-admin__role-select"
          @input="$emit('update:role', $event)"
        >
          <option
            v-for="option in roles"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </AppNativeSelect>
      </div>
    </div>

    <div class="permissions-admin__groups">
      <section
        v-for="group in groups"
        :key="`${role}-${group.label}`"
        class="permissions-admin__group"
      >
        <div class="permissions-admin__group-title">
          {{ group.label }}
        </div>
        <div
          v-for="permission in group.permissions"
          :key="`${role}-${permission.key}`"
          class="permissions-admin__permission-row"
        >
          <v-switch
            :model-value="isEnabled(role, permission.key)"
            inset
            hide-details
            color="primary"
            class="permissions-admin__switch"
            :disabled="savingKey === `${role}:${permission.key}`"
            :aria-label="permission.label"
            @update:model-value="$emit('change', { role, key: permission.key, enabled: $event })"
          />
          <span
            class="permissions-admin__permission-label"
            :class="{ 'permissions-admin__permission-label--muted': !isEnabled(role, permission.key) }"
          >
            {{ permission.label }}
          </span>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import { AppNativeSelect } from '../ui';

export default {
  name: 'PermissionsMatrixPanel',
  components: { AppNativeSelect },
  props: {
    role: { type: String, required: true },
    roles: { type: Array, required: true },
    groups: { type: Array, required: true },
    savingKey: { type: String, default: '' },
    isEnabled: { type: Function, required: true },
  },
  emits: ['change', 'update:role'],
};
</script>
