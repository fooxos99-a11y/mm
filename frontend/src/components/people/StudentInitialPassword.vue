<template>
  <div class="people-dialog__field">
    <AppButton
      variant="secondary"
      :loading="loading"
      :disabled="loading"
      @click="reveal"
    >
      {{ password ? 'إخفاء كلمة المرور الأولية' : 'إظهار كلمة المرور الأولية' }}
    </AppButton>
    <AppPasswordField
      v-if="password"
      :value="password"
      readonly
      aria-label="كلمة المرور الأولية"
      autocomplete="off"
    />
    <p
      v-if="message"
      role="status"
    >
      {{ message }}
    </p>
  </div>
</template>

<script>
import { AppButton, AppPasswordField } from '../ui';
import { revealStudentInitialPassword } from '../../services/studentImportApi';

export default {
  components: { AppButton, AppPasswordField },
  props: { studentId: { type: String, required: true } },
  data: () => ({ password: '', message: '', loading: false }),
  watch: { studentId() { this.password = ''; this.message = ''; } },
  methods: {
    async reveal() {
      if (this.password) { this.password = ''; return; }
      this.loading = true; this.message = '';
      const studentId = this.studentId;
      try {
        const result = await revealStudentInitialPassword(studentId);
        if (studentId !== this.studentId) return;
        this.password = result.password || '';
        if (!result.available) this.message = 'كلمة المرور الأولية غير متاحة. يمكنك تعيين كلمة مرور جديدة.';
      } catch {
        this.message = 'تعذّر عرض كلمة المرور. حاول مرة أخرى.';
      } finally { this.loading = false; }
    },
  },
};
</script>
