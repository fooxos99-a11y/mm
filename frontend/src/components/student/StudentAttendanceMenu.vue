<template>
  <AppButton
    v-if="sessions.length && !sessions[0].attended"
    variant="plain"
    class="account-menu__item"
    @click="open"
  >
    التحضير
  </AppButton>
  <AppDialog
    :value="dialog"
    :persistent="busy"
    max-width="440"
    @input="dialog = $event"
  >
    <DialogShell title="تأكيد الحضور">
      <template #actions>
        <AppButton
          variant="secondary"
          :disabled="busy"
          @click="dialog = false"
        >
          إلغاء
        </AppButton>
        <AppButton
          :loading="busy"
          :disabled="busy || !selected"
          @click="attend"
        >
          تأكيد
        </AppButton>
      </template>
    </DialogShell>
  </AppDialog>
</template>
<script>
import { AppButton, AppDialog, DialogShell } from '../ui';
import { availableAttendance, attendanceChallenge, attendSession } from '../../services/attendanceApi';
export default {
  name: 'StudentAttendanceMenu',
  components: { AppButton, AppDialog, DialogShell },
  data: () => ({ sessions: [], selectedId: '', dialog: false, busy: false, timer: null, disposed: false }),
  computed: { selected() { return this.sessions.find(session => session.id === this.selectedId); } },
  created() { this.refresh(); this.timer = setInterval(() => this.refresh(), 10000); },
  beforeUnmount() { this.disposed = true; clearInterval(this.timer); },
  methods: {
    async refresh() {
      try {
        const sessions = await availableAttendance();
        if (this.disposed) return false;
        this.sessions = sessions;
        if (this.dialog && !sessions.some(session => session.id === this.selectedId && !session.attended)) this.dialog = false;
        if (!this.dialog) this.selectedId = sessions[0]?.id || '';
        return true;
      } catch { return false; }
    },
    async open() {
      if (!await this.refresh()) { this.$toast.error('تعذر تحميل التحضير. حاول مرة أخرى.'); return; }
      if (this.sessions[0] && !this.sessions[0].attended) {
        this.selectedId = this.sessions[0].id;
        this.dialog = true;
      }
    },
    async attend() {
      if (this.busy || !this.selected || this.selected.attended) return;
      this.busy = true;
      const session = this.selected;
      try {
        const challenge = await attendanceChallenge(session);
        if (!navigator.geolocation || !window.isSecureContext) throw new Error('تعذر التحقق من الموقع.');
        const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject,
          { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }));
        await attendSession(session, { challenge, latitude: position.coords.latitude, longitude: position.coords.longitude,
          accuracy: position.coords.accuracy, timestamp: position.timestamp });
        this.dialog = false;
        this.$toast.success('تم تسجيل الحضور');
        await this.refresh();
        this.$store.dispatch('loadDashboardSnapshot', { background: true }).catch(() => {});
      } catch (error) {
        this.dialog = false;
        this.$toast.error(error?.response?.data?.message || (error.code === 1 ? 'لم يُسمح بالوصول إلى الموقع.' : 'تعذر التحقق من الموقع أو تسجيل الحضور.'));
        await this.refresh();
      } finally { this.busy = false; }
    },
  },
};
</script>
