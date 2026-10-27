<template>
  <AppCard>
    <form
      class="attendance-settings"
      @submit.prevent="save"
    >
      <h2>التحضير</h2>
      <AppButton
        :variant="form.enabled ? 'primary' : 'secondary'"
        :disabled="busy"
        :aria-pressed="form.enabled"
        @click="form.enabled = !form.enabled"
      >
        تفعيل التحضير الذاتي للطلاب: {{ form.enabled ? 'تشغيل' : 'إيقاف' }}
      </AppButton>
      <AppInput
        v-model="form.mapsUrl"
        label="موقع التحضير"
        type="url"
        dir="ltr"
        :disabled="busy"
      />
      <AppInput
        v-model="form.radius"
        label="نطاق التحضير (متر)"
        type="number"
        min="1"
        max="100000"
        :disabled="busy"
      />
      <p
        v-if="error"
        role="alert"
      >
        {{ error }}
      </p>
      <AppButton
        type="submit"
        :loading="busy"
        :disabled="busy"
      >
        حفظ
      </AppButton>
    </form>
  </AppCard>
</template>
<script>
import { AppButton, AppCard, AppInput } from '../components/ui';
import { attendanceSettings, saveAttendanceSettings } from '../services/attendanceApi';
export default {
  name: 'AdminAttendanceSettingsView',
  components: { AppButton, AppCard, AppInput },
  data: () => ({ form: { enabled: false, mapsUrl: '', radius: 300 }, busy: true, error: '' }),
  async created() {
    try { this.form = await attendanceSettings(); }
    catch (error) { this.error = error?.response?.data?.message || 'تعذر تحميل الإعدادات'; }
    finally { this.busy = false; }
  },
  methods: {
    async save() {
      this.busy = true; this.error = '';
      try {
        this.form = await saveAttendanceSettings({ enabled: this.form.enabled, mapsUrl: this.form.mapsUrl, radius: Number(this.form.radius) });
        this.$toast.success('تم حفظ الإعدادات');
      } catch (error) { this.error = error?.response?.data?.message || 'تعذر حفظ الإعدادات'; }
      finally { this.busy = false; }
    },
  },
};
</script>
<style scoped>
.attendance-settings { display: grid; gap: 20px; max-width: 560px; margin-inline: auto; }
.attendance-settings h2 { color: var(--app-primary-dark); }
.attendance-settings [role='alert'] { color: var(--app-danger); }
</style>
