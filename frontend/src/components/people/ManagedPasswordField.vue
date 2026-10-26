<template>
  <div
    v-if="password || failed"
    class="people-dialog__field"
  >
    <AppPasswordField
      v-if="password"
      :value="password"
      label="كلمة المرور الحالية"
      aria-label="كلمة المرور الحالية"
      autocomplete="off"
      readonly
      hide-details
    />
    <AppButton
      v-if="failed"
      variant="secondary"
      @click="loadPassword"
    >
      إعادة المحاولة
    </AppButton>
  </div>
</template>

<script>
import { AppButton, AppPasswordField } from '../ui';
import { revealPersonPassword } from '../../services/peopleDirectoryApi';

export default {
  components: { AppButton, AppPasswordField },
  props: {
    personId: { type: String, required: true },
    entityType: { type: String, required: true },
  },
  data: () => ({ password: '', failed: false, requestVersion: 0 }),
  mounted() { this.loadPassword(); },
  beforeUnmount() { this.requestVersion += 1; this.password = ''; },
  methods: {
    async loadPassword() {
      const version = ++this.requestVersion;
      this.password = ''; this.failed = false;
      try {
        const result = await revealPersonPassword(this.entityType, this.personId);
        if (version !== this.requestVersion) return;
        this.password = result.password || '';
      } catch {
        if (version !== this.requestVersion) return;
        this.failed = true;
      }
    },
  },
};
</script>
