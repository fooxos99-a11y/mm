<template>
  <details
    v-if="history.length"
    class="attendance-history"
  >
    <summary>سجلات الحضور السابقة ({{ history.length }})</summary>
    <p>حضور محفوظ قبل الجلسة المعروضة.</p>
    <ul aria-label="سجلات الحضور السابقة">
      <li
        v-for="record in history"
        :key="record.id"
      >
        <strong>{{ record.studentName }}</strong>
        <span>{{ record.createdAt }}</span>
        <span v-if="record.hours != null">ساعات الحضور: {{ record.hours }}</span>
      </li>
    </ul>
  </details>
</template>
<script>
import { previousAttendanceRecords } from '../../features/assessment/attendanceHistory.mjs';

export default {
  name: 'AttendanceHistory',
  props: {
    records: { type: Array, default: () => [] }, students: { type: Array, default: () => [] },
    courseId: { type: String, default: '' }, sessionId: { type: String, default: '' },
  },
  computed: { history() { return previousAttendanceRecords(this.records, this.students, this.courseId, this.sessionId); } },
};
</script>
<style scoped>
.attendance-history { margin-top: 20px; border-top: 1px solid var(--app-border); padding-top: 12px; }
summary { min-height: 44px; padding-block: 10px; cursor: pointer; color: var(--app-primary-dark); font-weight: 700; }
p { color: var(--app-text-muted); }
ul { list-style: none; margin: 0; padding: 0; max-height: 50dvh; overflow-y: auto; }
li { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 16px; padding-block: 12px; border-bottom: 1px solid var(--app-border); }
strong { flex: 1 1 180px; min-width: 0; overflow-wrap: anywhere; }
span { color: var(--app-text-muted); font-size: var(--app-font-sm); overflow-wrap: anywhere; }
</style>
