<template>
  <AppButton
    v-if="sessions.length"
    variant="plain"
    class="account-menu__item"
    @click="open"
  >
    التحضير
  </AppButton>
  <AppDialog
    :value="dialog"
    max-width="440"
    @input="dialog = $event"
  >
    <DialogShell title="التحضير">
      <div class="student-attendance-fields">
        <label
          v-if="sessions.length > 1"
          class="app-field"
        >
          <span class="app-field__label">الدورة</span>
          <AppNativeSelect
            v-model="selectedId"
            :disabled="busy"
            aria-label="الدورة"
            @input="error = ''"
          >
            <option
              v-for="session in sessions"
              :key="session.id"
              :value="session.id"
            >{{ session.title }}</option>
          </AppNativeSelect>
        </label>
        <template v-if="selected">
          <AppInput
            v-if="sessions.length === 1"
            label="الدورة"
            :value="selected.title"
            disabled
          />
          <AppInput
            label="عدد ساعات التحضير"
            :value="selected.hours"
            disabled
          />
          <p
            v-if="selected.attended"
            role="status"
          >
            تم تسجيل الحضور
          </p>
        </template>
        <p
          v-else
          role="status"
        >
          لا يوجد تحضير مفتوح
        </p>
        <p
          v-if="error"
          role="alert"
        >
          {{ error }}
        </p>
      </div>
      <template #actions>
        <AppButton
          variant="secondary"
          :disabled="busy"
          @click="dialog = false"
        >
          إغلاق
        </AppButton>
        <AppButton
          v-if="selected && !selected.attended"
          :loading="busy"
          :disabled="busy"
          @click="attend"
        >
          تسجيل الحضور
        </AppButton>
      </template>
    </DialogShell>
  </AppDialog>
</template>
<script>
import { AppButton, AppDialog, AppInput, AppNativeSelect, DialogShell } from '../ui';
import { availableAttendance, attendanceChallenge, attendSession } from '../../services/attendanceApi';
export default {
  name: 'StudentAttendanceMenu',
  components: { AppButton, AppDialog, AppInput, AppNativeSelect, DialogShell },
  data: () => ({ sessions: [], selectedId: '', dialog: false, busy: false, error: '', timer: null, disposed: false }),
  computed: { selected() { return this.sessions.find(session => session.id === this.selectedId); } },
  created() { this.refresh(); this.timer = setInterval(() => this.refresh(), 10000); },
  beforeUnmount() { this.disposed = true; clearInterval(this.timer); },
  methods: {
    async refresh() {
      try {
        const sessions = await availableAttendance();
        if (this.disposed) return;
        this.sessions = sessions;
        if (!sessions.some(session => session.id === this.selectedId)) this.selectedId = sessions[0]?.id || '';
      } catch { this.sessions = []; }
    },
    async open() { await this.refresh(); if (this.sessions.length) { this.error = ''; this.dialog = true; } },
    async attend() {
      if (this.busy || !this.selected) return;
      this.busy = true; this.error = '';
      const session = this.selected;
      try {
        const challenge = await attendanceChallenge(session);
        if (!navigator.geolocation || !window.isSecureContext) throw new Error('تعذر التحقق من الموقع.');
        const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject,
          { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }));
        await attendSession(session, { challenge, latitude: position.coords.latitude, longitude: position.coords.longitude,
          accuracy: position.coords.accuracy, timestamp: position.timestamp });
        await this.refresh();
        this.$store.dispatch('loadDashboardSnapshot', { background: true }).catch(() => {});
      } catch (error) {
        this.error = error?.response?.data?.message || (error.code === 1 ? 'لم يُسمح بالوصول إلى الموقع.' : 'تعذر التحقق من الموقع أو تسجيل الحضور.');
        await this.refresh();
      } finally { this.busy = false; }
    },
  },
};
</script>
<style scoped>
.student-attendance-fields { display: grid; gap: 16px; }
[role='alert'] { color: var(--app-danger); }
</style>
