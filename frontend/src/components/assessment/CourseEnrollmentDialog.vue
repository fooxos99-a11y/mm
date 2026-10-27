<template>
  <AppDialog
    :value="true"
    max-width="520"
    :persistent="busy"
    @input="!busy && $emit('close')"
  >
    <DialogShell title="طلاب الدورة">
      <PeopleRemotePicker
        v-if="loaded"
        :branch="branch"
        label="الطلاب"
        :selected-ids="studentIds"
        :disabled="busy"
        multiple
        @select="toggle"
      />
      <p
        v-if="error"
        role="alert"
      >
        {{ error }}
      </p>
      <template #actions>
        <AppButton
          variant="secondary"
          :disabled="busy"
          @click="$emit('close')"
        >
          إلغاء
        </AppButton>
        <AppButton
          :disabled="busy || !loaded"
          :loading="busy"
          @click="save"
        >
          حفظ
        </AppButton>
      </template>
    </DialogShell>
  </AppDialog>
</template>
<script>
import { AppButton, AppDialog, DialogShell } from '../ui';
import PeopleRemotePicker from '../people/PeopleRemotePicker.vue';
import { courseEnrollments, saveCourseEnrollments } from '../../services/attendanceApi';
export default {
  name: 'CourseEnrollmentDialog',
  components: { AppButton, AppDialog, DialogShell, PeopleRemotePicker },
  props: { courseId: { type: String, required: true }, branch: { type: String, required: true } },
  emits: ['close', 'saved'],
  data: () => ({ studentIds: [], busy: true, loaded: false, error: '' }),
  async created() {
    try { this.studentIds = (await courseEnrollments(this.courseId, this.branch)).studentIds; this.loaded = true; }
    catch (error) { this.error = error?.response?.data?.message || 'تعذر تحميل طلاب الدورة'; }
    finally { this.busy = false; }
  },
  methods: {
    toggle(id) { this.studentIds = this.studentIds.includes(id) ? this.studentIds.filter(studentId => studentId !== id) : [...this.studentIds, id]; },
    async save() {
      this.busy = true; this.error = '';
      try { const result = await saveCourseEnrollments(this.courseId, this.branch, this.studentIds); this.$emit('saved', result.studentIds); }
      catch (error) { this.error = error?.response?.data?.message || 'تعذر حفظ طلاب الدورة'; }
      finally { this.busy = false; }
    },
  },
};
</script>
