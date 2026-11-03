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
import { acquireAttendancePosition } from '../../utils/attendancePosition.mjs';
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
        if (this.dialog && !sessions.some(session => session.id === this.selectedId)) this.dialog = false;
        if (!this.dialog) this.selectedId = sessions[0]?.id || '';
        return true;
      } catch { return false; }
    },
    async open() {
      if (!await this.refresh()) { this.$toast.error('تعذر تحميل التحضير. حاول مرة أخرى.'); return; }
      if (this.sessions[0]) {
        this.selectedId = this.sessions[0].id;
        this.dialog = true;
      }
    },
    async attend() {
      if (this.busy || !this.selected) return;
      this.busy = true;
      const sessionId = this.selectedId;
      try {
        if (!await this.refresh()) throw new Error('تعذر تحميل التحضير.');
        const session = this.sessions.find(row => row.id === sessionId);
        if (!session) throw Object.assign(new Error('التحضير مغلق.'), {
          userMessage: 'التحضير لهذه المحاضرة مغلق. افتح التحضير مجددًا.',
        });
        if (session.attended) {
          this.dialog = false;
          this.$toast.success('تم تسجيل الحضور');
          return;
        }
        const challenge = await attendanceChallenge(session);
        if (!navigator.geolocation || !window.isSecureContext) throw new Error('تعذر التحقق من الموقع.');
        const position = await acquireAttendancePosition(navigator.geolocation, challenge);
        await attendSession(session, { challenge: challenge.challenge, ...position });
        this.dialog = false;
        this.$toast.success('تم تسجيل الحضور');
        await this.refresh();
        this.$store.dispatch('loadDashboardSnapshot', { background: true }).catch(() => {});
      } catch (error) {
        this.dialog = false;
        this.$toast.error(error?.response?.data?.message || error.userMessage || (error.code === 1 ? 'لم يُسمح بالوصول إلى الموقع.' : 'تعذر التحقق من الموقع أو تسجيل الحضور.'));
        await this.refresh();
      } finally { this.busy = false; }
    },
  },
};
</script>
