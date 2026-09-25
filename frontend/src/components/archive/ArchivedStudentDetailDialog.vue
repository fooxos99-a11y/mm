<template>
  <AppDialog
    :value="value"
    max-width="1080"
    @input="$emit('input', $event)"
    @close="$emit('close')"
  >
    <div class="archive-dialog archive-dialog--detail">
      <AppDialogHeader title="سجل الطالب المؤرشف" />
      <AppDialogBody class="archive-dialog__detail-body">
        <div
          v-if="loading"
          class="admin-archive-view__details-empty"
        >
          جارٍ تحميل بيانات الطالب المؤرشف...
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
        </div>
        <div
          v-else
          class="admin-archive-view__details-empty"
        >
          لا توجد بيانات لعرضها لهذا الطالب المؤرشف.
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
  AppButton, AppDialog, AppDialogBody, AppDialogFooter, AppDialogHeader,
} from '../ui';

export default {
  name: 'ArchivedStudentDetailDialog',
  components: { AppButton, AppDialog, AppDialogBody, AppDialogFooter, AppDialogHeader },
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
};
</script>
