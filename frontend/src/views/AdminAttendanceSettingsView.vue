<template>
  <div
    class="attendance-admin"
    :class="{ 'attendance-admin--embedded': embedded }"
  >
    <form
      class="attendance-settings"
      @submit.prevent="save"
    >
      <AppSettingsPanel
        title="التحضير"
        class="attendance-admin__card"
      >
        <template #actions>
          <AppActionBar>
            <AppButton
              type="submit"
              variant="primary"
              :loading="busy"
              :disabled="busy"
            >
              حفظ
            </AppButton>
          </AppActionBar>
        </template>
        <template #filters>
          <AppFilterField
            for-id="attendance-settings-enabled"
            label="تفعيل التحضير الذاتي للطلاب"
          >
            <AppSelect
              id="attendance-settings-enabled"
              v-model="form.enabled"
              :items="enabledOptions"
              item-text="label"
              item-value="value"
              :disabled="busy"
              hide-details
            />
          </AppFilterField>
          <AppFilterField
            for-id="attendance-settings-radius"
            label="نطاق التحضير (متر)"
          >
            <AppInput
              id="attendance-settings-radius"
              v-model="form.radius"
              type="number"
              min="1"
              max="100000"
              :disabled="busy"
            />
          </AppFilterField>
        </template>
        <AppFilterField
          for-id="attendance-settings-location"
          label="موقع التحضير"
        >
          <AppInput
            id="attendance-settings-location"
            v-model="form.mapsUrl"
            type="url"
            dir="ltr"
            :disabled="busy"
          />
        </AppFilterField>
        <p
          v-if="error"
          role="alert"
        >
          {{ error }}
        </p>
      </AppSettingsPanel>
    </form>
  </div>
</template>
<script>
import { AppActionBar, AppButton, AppFilterField, AppInput, AppSelect, AppSettingsPanel } from '../components/ui';
import { attendanceSettings, saveAttendanceSettings } from '../services/attendanceApi';
export default {
  name: 'AdminAttendanceSettingsView',
  components: { AppActionBar, AppButton, AppFilterField, AppInput, AppSelect, AppSettingsPanel },
  props: { embedded: Boolean },
  data: () => ({ form: { enabled: false, mapsUrl: '', radius: 300 }, busy: true, error: '',
    enabledOptions: [{ value: false, label: 'إيقاف' }, { value: true, label: 'تشغيل' }] }),
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
.attendance-admin { min-width: 0; }
.attendance-settings [role='alert'] { color: var(--app-danger); }
</style>
