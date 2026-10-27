<template>
  <div class="attendance-session-control">
    <span
      v-if="showAction && active"
      role="status"
    >مفتوح</span>
    <AppButton
      v-if="showAction && canEdit"
      :disabled="busy || saving"
      @click="toggle"
    >
      {{ active ? 'إغلاق التحضير' : 'فتح التحضير' }}
    </AppButton>
    <p
      v-if="error"
      role="alert"
    >
      {{ error }}
    </p>
    <AppDialog
      :value="dialog"
      max-width="420"
      @input="dialog = $event"
    >
      <DialogShell title="فتح التحضير">
        <div class="attendance-session-fields">
          <AppInput
            label="الدورة"
            :value="course.title"
            disabled
          />
          <AppInput
            v-model="hours"
            label="مدة فتح التحضير"
            type="number"
            min="0.01"
            max="9999"
            step="0.01"
          />
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
            إلغاء
          </AppButton>
          <AppButton
            :loading="busy"
            :disabled="busy"
            @click="open"
          >
            فتح التحضير
          </AppButton>
        </template>
      </DialogShell>
    </AppDialog>
  </div>
</template>
<script>
import { AppButton, AppDialog, AppInput, DialogShell } from '../ui';
import { attendanceSessions, openAttendance, closeAttendance, courseEnrollments } from '../../services/attendanceApi';
export default {
  name: 'AttendanceSessionControl',
  components: { AppButton, AppDialog, AppInput, DialogShell },
  props: { course: { type: Object, required: true }, branch: { type: String, required: true }, canEdit: Boolean, saving: Boolean,
    showAction: { type: Boolean, default: true } },
  emits: ['select', 'enrollments', 'action-state'],
  data: () => ({ sessions: [], hours: '', dialog: false, busy: true, error: '', revision: 0 }),
  computed: {
    active() { return this.sessions.find(session => session.isOpen); },
    actionState() { return { label: this.active ? 'إغلاق التحضير' : 'فتح التحضير', disabled: this.busy || this.saving }; },
  },
  watch: {
    actionState: { immediate: true, deep: true, handler(value) { this.$emit('action-state', value); } },
    'course.id': { immediate: true, handler() { this.load(); } },
    branch() { this.load(); },
  },
  methods: {
    toggle() {
      if (!this.canEdit || this.busy || this.saving) return;
      if (this.active) return this.close();
      this.dialog = true;
    },
    async load() {
      const revision = ++this.revision;
      this.busy = true; this.error = ''; this.$emit('select', { loading: true }); this.$emit('enrollments', null);
      try {
        const [sessions, roster] = await Promise.all([attendanceSessions(this.course.id), courseEnrollments(this.course.id, this.branch)]);
        if (revision !== this.revision) return;
        this.sessions = sessions;
        this.$emit('enrollments', roster.studentIds);
        this.$emit('select', this.active || sessions[0] || null);
      } catch (error) { if (revision === this.revision) this.error = error?.response?.data?.message || 'تعذر تحميل التحضير'; }
      finally { if (revision === this.revision) this.busy = false; }
    },
    async open() {
      this.busy = true; this.error = '';
      try {
        const session = await openAttendance(this.course.id, Number(this.hours));
        this.sessions = [session, ...this.sessions];
        this.dialog = false;
        this.$emit('select', session);
      }
      catch (error) { this.error = error?.response?.data?.message || 'تعذر فتح التحضير'; }
      finally { this.busy = false; }
    },
    async close() {
      this.busy = true; this.error = '';
      try {
        const active = this.active;
        await closeAttendance(this.course.id, active.id);
        const closed = { ...active, isOpen: false };
        this.sessions = this.sessions.map(session => session.id === active.id ? closed : session);
        this.$emit('select', closed);
      }
      catch (error) { this.error = error?.response?.data?.message || 'تعذر إغلاق التحضير'; }
      finally { this.busy = false; }
    },
  },
};
</script>
<style scoped>
.attendance-session-control { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.attendance-session-control > :first-child { max-width: 100%; }
.attendance-session-fields { display: grid; gap: 16px; }
[role='alert'] { color: var(--app-danger); }
</style>
