<template>
  <AppDialog
    :value="open"
    max-width="760"
    persistent
    scrollable
    :close-on-backdrop="false"
  >
    <div
      class="app-dialog grade-dialog"
      dir="rtl"
    >
      <AppDialogHeader
        :title="`درجات ${typeLabel}`"
        :eyebrow="courseTitle"
        :closable="!saving"
        title-tag="h2"
        @close="requestClose"
      />
      <AppDialogBody class="grade-dialog__body">
        <div class="grade-dialog__controls">
          <AppInput
            :model-value="total"
            label="الدرجة الكاملة"
            type="number"
            min="0.01"
            max="1000000"
            step="0.01"
            inputmode="decimal"
            :disabled="totalLocked || loading || saving"
            :error="errors.totalPoints || ''"
            :aria-invalid="Boolean(errors.totalPoints)"
            @update:model-value="$emit('update:total', $event)"
          />
          <AppInput
            :model-value="search"
            label="البحث عن طالب"
            type="search"
            placeholder="الاسم أو رقم الدخول"
            :disabled="loading || saving"
            @update:model-value="$emit('update:search', $event)"
          />
        </div>
        <div
          v-if="error"
          class="grade-dialog__error"
          role="alert"
        >
          {{ error }}
          <AppButton
            v-if="conflict || loadFailed"
            variant="secondary"
            :disabled="saving || loading"
            @click="$emit('reload')"
          >
            {{ conflict ? 'تحديث الدرجات الحالية' : 'إعادة المحاولة' }}
          </AppButton>
        </div>
        <p
          v-if="loading"
          role="status"
        >
          جارٍ تحميل جميع الطلاب...
        </p>
        <template v-else-if="!loadFailed">
          <p class="grade-dialog__hint">
            الخانة الفارغة تُتجاهل، والصفر درجة صحيحة.
          </p>
          <div
            class="grade-dialog__columns"
            aria-hidden="true"
          >
            <span>الطالب</span><span>الدرجة</span>
          </div>
          <div
            v-for="row in visibleRows"
            :key="row.id"
            class="grade-dialog__row"
            :data-student-id="row.id"
          >
            <div class="grade-dialog__identity">
              <strong :id="`grade-name-${row.id}`">{{ row.name }}</strong>
              <span dir="ltr">{{ row.loginId }}</span>
              <small>المحفوظة: {{ row.currentLabel }}</small>
            </div>
            <div class="grade-dialog__field">
              <AppInput
                :model-value="row.value"
                type="number"
                min="0"
                :max="Number(total) || undefined"
                step="0.01"
                inputmode="decimal"
                :aria-label="`درجة ${row.name}`"
                :aria-invalid="Boolean(errors[row.id])"
                :disabled="saving || row.clear"
                :error="errors[row.id] || ''"
                @update:model-value="$emit('update-grade', { id: row.id, value: $event })"
              />
              <AppButton
                v-if="row.manual"
                variant="plain"
                :disabled="saving"
                @click="$emit('clear-grade', row.id)"
              >
                {{ row.clear ? 'تراجع عن الإلغاء' : 'إلغاء الدرجة اليدوية' }}
              </AppButton>
            </div>
          </div>
          <p v-if="!visibleRows.length">
            {{ rows.length ? 'لا توجد أسماء مطابقة للبحث.' : 'لا يوجد طلاب في هذا الفرع.' }}
          </p>
        </template>
      </AppDialogBody>
      <AppDialogFooter>
        <output aria-live="polite">عدد التعديلات: {{ changedCount }}</output>
        <AppButton
          variant="secondary"
          :disabled="saving"
          @click="requestClose"
        >
          إغلاق
        </AppButton>
        <AppButton
          :loading="saving"
          :disabled="loading || loadFailed || conflict || !changedCount"
          @click="$emit('save')"
        >
          {{ saving ? 'جارٍ الحفظ...' : 'حفظ الدرجات' }}
        </AppButton>
      </AppDialogFooter>
    </div>
  </AppDialog>
  <AppDialog
    :value="confirmClose"
    max-width="440"
    persistent
  >
    <div class="app-dialog">
      <AppDialogHeader
        title="إغلاق دون حفظ؟"
        title-tag="h2"
      />
      <AppDialogBody>ستفقد تعديلات الدرجات التي لم تحفظها.</AppDialogBody>
      <AppDialogFooter>
        <AppButton
          variant="secondary"
          @click="confirmClose = false"
        >
          متابعة التعديل
        </AppButton>
        <AppButton
          variant="danger"
          @click="confirmClose = false; $emit('close')"
        >
          إغلاق دون حفظ
        </AppButton>
      </AppDialogFooter>
    </div>
  </AppDialog>
</template>

<script>
import { AppButton, AppDialog, AppDialogHeader, AppDialogBody, AppDialogFooter, AppInput } from '../ui';

export default {
  name: 'ResultsGradeDialog',
  components: { AppButton, AppDialog, AppDialogHeader, AppDialogBody, AppDialogFooter, AppInput },
  props: {
    open: Boolean, loading: Boolean, saving: Boolean, totalLocked: Boolean, conflict: Boolean, loadFailed: Boolean,
    courseTitle: { type: String, default: '' }, typeLabel: { type: String, default: '' },
    total: { type: [String, Number], default: '' }, search: { type: String, default: '' },
    rows: { type: Array, default: () => [] }, errors: { type: Object, default: () => ({}) },
    error: { type: String, default: '' }, changedCount: { type: Number, default: 0 },
  },
  emits: ['close', 'save', 'reload', 'update:total', 'update:search', 'update-grade', 'clear-grade'],
  data: () => ({ confirmClose: false }),
  computed: {
    visibleRows() {
      const search = this.search.trim().toLocaleLowerCase('ar');
      return this.rows.filter(row => `${row.name} ${row.loginId}`.toLocaleLowerCase('ar').includes(search));
    },
  },
  methods: {
    requestClose() {
      if (this.saving) return;
      if (this.changedCount) this.confirmClose = true;
      else this.$emit('close');
    },
  },
};
</script>
<style src="../../styles/components/results-grade-dialog.css"></style>
