<template>
  <AppDialog
    :value="value"
    max-width="1080"
    @input="$emit('input', $event)"
    @close="$emit('close')"
  >
    <div class="archive-dialog archive-dialog--detail">
      <AppDialogHeader :title="detail?.archive?.id === null ? 'سجل المعلم' : 'سجل المعلم المؤرشف'" />
      <AppDialogBody class="archive-dialog__detail-body">
        <div
          v-if="loading"
          class="admin-archive-view__details-empty"
        >
          جارٍ تحميل السجل...
        </div>
        <div
          v-else-if="detail"
          class="admin-archive-view__details"
        >
          <div class="admin-archive-view__details-header">
            <div>
              <h3 class="admin-archive-view__details-name">
                {{ detail.student.name }}
              </h3>
              <div
                v-if="detail.student.loginCode"
                class="admin-archive-view__details-meta"
              >
                رقم الدخول: <bdi>{{ detail.student.loginCode }}</bdi> · {{ detail.student.branchName }}
              </div>
              <div
                v-if="detail.student.completedParts"
                class="admin-archive-view__details-meta"
              >
                الأجزاء المكتملة: {{ detail.student.completedParts.length }}
              </div>
              <div
                v-if="detail.student.note"
                class="admin-archive-view__details-meta"
              >
                الملاحظة: {{ detail.student.note }}
              </div>
            </div>
          </div>

          <section
            v-if="detail.student.completionResult"
            class="admin-archive-view__completion-result"
          >
            <div class="admin-archive-view__completion-head">
              <div class="admin-archive-view__mini-title">
                نتيجة الاجتياز
              </div>
              <strong :class="`admin-archive-view__completion-status--${detail.student.completionResult.status}`">
                {{ completionStatus }}
              </strong>
            </div>
            <div class="admin-archive-view__registration-grid">
              <div
                v-for="item in completionRows"
                :key="item.label"
                class="admin-archive-view__registration-item"
              >
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
          </section>

          <section
            v-if="registrationRows.length"
            class="admin-archive-view__registration-profile"
          >
            <div class="admin-archive-view__mini-title">
              بيانات التسجيل
            </div>
            <div class="admin-archive-view__registration-grid">
              <div
                v-for="item in registrationRows"
                :key="item.label"
                class="admin-archive-view__registration-item"
              >
                <span>{{ item.label }}</span>
                <strong>{{ item.value || '--' }}</strong>
              </div>
            </div>
          </section>

          <section class="admin-archive-view__stats">
            <div
              v-for="item in stats"
              :key="item.key"
              class="admin-archive-view__stat-card"
            >
              <span class="admin-archive-view__stat-value">{{ item.value }}</span>
              <span class="admin-archive-view__stat-label">{{ item.label }}</span>
            </div>
          </section>

          <section
            v-if="detail.finalExam"
            class="admin-archive-view__final-exam-card"
          >
            <div class="admin-archive-view__mini-title">
              الاختبار النهائي
            </div>
            <div class="admin-archive-view__assessment-grid">
              <div class="admin-archive-view__assessment-item">
                <span class="admin-archive-view__assessment-label">الدرجة</span>
                <strong>{{ formatScore(detail.finalExam.manualScore) }}</strong>
              </div>
              <div class="admin-archive-view__assessment-item">
                <span class="admin-archive-view__assessment-label">تاريخ الإرسال</span>
                <strong>{{ formatDateTime(detail.finalExam.submittedAt) }}</strong>
              </div>
            </div>
          </section>
          <section
            v-if="detail.courses?.length"
            class="admin-archive-view__course-records"
          >
            <h4>الدورات والمهام</h4>
            <AppTable
              :items="detail.courses"
              :columns="courseColumns"
            >
              <template #cell-attendance="{ item }">
                {{ item.attendance?.isPresent ? 'حاضر' : 'لم يحضر' }}
              </template>
              <template #cell-pre="{ item }">
                {{ item.pre ? (item.pre.manualScore ?? 'مرسل') : 'لم يرسل' }}
              </template>
              <template #cell-post="{ item }">
                {{ item.post ? (item.post.manualScore ?? 'مرسل') : 'لم يرسل' }}
              </template>
              <template #cell-tasks="{ item }">
                {{ item.tasks ? (item.tasks.manualScore ?? 'مرسل') : 'لم يرسل' }}
              </template>
            </AppTable>
          </section>
        </div>
        <div
          v-else
          class="admin-archive-view__details-empty"
        >
          لا توجد بيانات لعرضها لهذا المعلم.
        </div>
      </AppDialogBody>
      <AppDialogFooter class="archive-dialog__footer">
        <AppButton
          variant="secondary"
          @click="$emit('close')"
        >
          إغلاق
        </AppButton>
      </AppDialogFooter>
    </div>
  </AppDialog>
</template>

<script>
import {
  AppButton, AppDialog, AppDialogBody, AppDialogFooter, AppDialogHeader, AppTable,
} from '../ui';

export default {
  name: 'ArchivedStudentDetailDialog',
  components: { AppButton, AppDialog, AppDialogBody, AppDialogFooter, AppDialogHeader, AppTable },
  props: {
    value: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    detail: { type: Object, default: null },
    completionStatus: { type: String, default: '' },
    completionRows: { type: Array, required: true },
    registrationRows: { type: Array, required: true },
    stats: { type: Array, required: true },
    formatScore: { type: Function, required: true },
    formatDateTime: { type: Function, required: true },
  },
  emits: ['input', 'close'],
  data: () => ({ courseColumns: [
    { key: 'title', label: 'الدورة أو المهمة' }, { key: 'attendance', label: 'الحضور' },
    { key: 'pre', label: 'الاختبار القبلي' }, { key: 'post', label: 'الاختبار البعدي' }, { key: 'tasks', label: 'المهام' },
  ] }),
};
</script>
