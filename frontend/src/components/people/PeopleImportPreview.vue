<template>
  <AppDialog
    :value="!!preview"
    max-width="780"
    @input="!$event && $emit('close')"
  >
    <div
      v-if="preview"
      class="people-import-preview"
      dir="rtl"
    >
      <AppDialogHeader title="مراجعة الإضافة الجماعية" />
      <AppDialogBody>
        <p>الإدارة: <strong>{{ preview.departmentName }}</strong> — العدد: {{ preview.count }}</p>
        <p
          v-if="preview.identityConflicts?.length"
          role="alert"
        >
          توجد بيانات تطابق حسابات أو صفوفًا أخرى في {{ preview.identityConflicts.length }} صف. راجع المطابقة قبل إنشاء حسابات جديدة.
        </p>
        <p
          v-if="preview.alreadyImported"
          role="status"
        >
          استُورد هذا الملف سابقًا. لن تتكرر الحسابات.
        </p>
        <p
          v-if="preview.conflicts.length"
          role="alert"
        >
          أرقام دخول مستخدمة: {{ preview.conflicts.join('، ') }}. لم يُضف أي حساب.
        </p>
        <p
          v-if="error"
          role="alert"
        >
          {{ error }}
        </p>
        <details v-if="preview.warnings.length">
          <summary>بيانات تحتاج مراجعة: {{ preview.warnings.length }}</summary>
          <p
            v-for="(warning, index) in preview.warnings"
            :key="index"
          >
            الصف {{ warning.sourceRow }}: {{ warning.message }}
          </p>
        </details>
        <div
          class="people-import-preview__table"
          tabindex="0"
          aria-label="معاينة أسماء الطلاب وأرقام الدخول"
        >
          <table>
            <thead><tr><th>صف المصدر</th><th>الاسم</th><th>رقم الدخول</th></tr></thead>
            <tbody>
              <tr
                v-for="row in preview.rows"
                :key="row.sourceRow"
              >
                <td>{{ row.sourceRow }}</td><td>{{ row.name }}</td><td dir="ltr">
                  {{ row.loginCode }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppDialogBody>
      <AppDialogFooter>
        <AppButton
          variant="primary"
          :loading="busy"
          :disabled="busy || preview.alreadyImported || !!preview.conflicts.length || !!preview.identityConflicts?.length"
          @click="$emit('confirm')"
        >
          إضافة {{ preview.count }} حسابًا
        </AppButton>
        <AppButton
          variant="secondary"
          :disabled="busy"
          @click="$emit('close')"
        >
          إلغاء
        </AppButton>
      </AppDialogFooter>
    </div>
  </AppDialog>
</template>
<script>
import { AppDialog, AppDialogHeader, AppDialogBody, AppDialogFooter, AppButton } from '../ui';
export default {
  components: { AppDialog, AppDialogHeader, AppDialogBody, AppDialogFooter, AppButton },
  props: { preview: { type: Object, default: null }, busy: Boolean, error: { type: String, default: '' } },
  emits: ['close', 'confirm'],
};
</script>
<style scoped>
.people-import-preview { padding: 12px; background: #fff; border-radius: 16px; }
.people-import-preview__table { max-height: 45vh; overflow: auto; margin-top: 16px; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { padding: 10px; text-align: start; border-bottom: 1px solid #e5e7eb; }
th { position: sticky; top: 0; background: white; }
</style>
