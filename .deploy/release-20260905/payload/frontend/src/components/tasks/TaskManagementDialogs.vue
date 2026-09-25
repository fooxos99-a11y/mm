<template>
  <div class="task-dialogs-host">
    <AppDialog
      :value="saveTemplateOpen"
      max-width="620"
      @input="$emit('update:save-template-open', $event)"
    >
      <DialogShell title="حفظ القالب">
        <p>هل تريد حفظ القالب؟</p>
        <template #actions>
          <AppButton
            variant="secondary"
            :disabled="createSubmitting"
            @click="$emit('confirm-template', false)"
          >
            لا
          </AppButton>
          <AppButton
            variant="primary"
            :disabled="createSubmitting"
            @click="$emit('confirm-template', true)"
          >
            نعم
          </AppButton>
        </template>
      </DialogShell>
    </AppDialog>

    <AppDialog
      :value="renameOpen"
      max-width="620"
      @input="$emit('update:rename-open', $event)"
    >
      <DialogShell title="تعديل اسم المهمة">
        <label for="task-rename-title">اسم المهمة</label>
        <input
          id="task-rename-title"
          :value="renameTitle"
          class="assessment-input"
          @input="$emit('update:rename-title', $event.target.value)"
        >
        <template #actions>
          <AppButton
            variant="secondary"
            @click="$emit('cancel-rename')"
          >
            إلغاء
          </AppButton>
          <AppButton
            variant="primary"
            :loading="renameSubmitting"
            @click="$emit('submit-rename')"
          >
            حفظ
          </AppButton>
        </template>
      </DialogShell>
    </AppDialog>

    <AppDialog
      :value="deleteOpen"
      max-width="620"
      @input="$emit('update:delete-open', $event)"
    >
      <DialogShell title="تأكيد حذف المهمة">
        <p>هل أنت متأكد من حذف المهمة <strong>{{ deleteTitle || 'المحددة' }}</strong>؟</p>
        <template #actions>
          <AppButton
            variant="secondary"
            @click="$emit('cancel-delete')"
          >
            إلغاء
          </AppButton>
          <AppButton
            variant="danger"
            :loading="deleteSubmitting"
            @click="$emit('confirm-delete')"
          >
            حذف
          </AppButton>
        </template>
      </DialogShell>
    </AppDialog>

    <AppDialog
      :value="availabilityOpen"
      max-width="560"
      @input="$emit('update:availability-open', $event)"
    >
      <DialogShell title="فتح المهمة الأدائية">
        <template v-if="!managedBranchId">
          <label for="task-availability-branch">الفرع</label>
          <AppNativeSelect
            id="task-availability-branch"
            :value="availabilityBranch"
            @input="$emit('update:availability-branch', $event)"
          >
            <option value="all">
              الكل
            </option><option value="male">
              معلمين
            </option><option value="female">
              معلمات
            </option>
          </AppNativeSelect>
        </template>
        <label for="task-availability-minutes">مدة الفتح بالدقائق</label>
        <input
          id="task-availability-minutes"
          :value="availabilityMinutes"
          type="number"
          min="1"
          class="assessment-input"
          @input="updateMinutes($event.target.value)"
        >
        <p
          v-if="availabilityError"
          class="task-dialog-error"
          role="alert"
        >
          {{ availabilityError }}
        </p>
        <template #actions>
          <AppButton
            variant="secondary"
            @click="$emit('cancel-availability')"
          >
            إلغاء
          </AppButton>
          <AppButton
            variant="primary"
            :loading="availabilitySubmitting"
            @click="$emit('confirm-availability')"
          >
            فتح
          </AppButton>
        </template>
      </DialogShell>
    </AppDialog>

    <AppDialog
      :value="manageOpen"
      max-width="560"
      @input="$emit('update:manage-open', $event)"
    >
      <DialogShell title="إدارة حالة المهمة الأدائية">
        <label for="task-manage-choice">الإجراء</label>
        <AppNativeSelect
          id="task-manage-choice"
          :value="manageChoice"
          @input="$emit('update:manage-choice', $event)"
        >
          <option
            v-for="option in manageOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </AppNativeSelect>
        <template #actions>
          <AppButton
            variant="secondary"
            @click="$emit('cancel-manage')"
          >
            إلغاء
          </AppButton>
          <AppButton
            variant="primary"
            :loading="manageSubmitting"
            :disabled="!manageChoice || manageSubmitting"
            @click="$emit('confirm-manage')"
          >
            متابعة
          </AppButton>
        </template>
      </DialogShell>
    </AppDialog>

    <AppDialog
      :value="conflictOpen"
      max-width="620"
      @input="$emit('update:conflict-open', $event)"
    >
      <DialogShell title="تنبيه: فرع نشط">
        <p v-if="conflict.pendingBranch && conflict.activeBranch">
          الفرع <strong>{{ branchLabel(conflict.activeBranch) }}</strong> مفتوح حاليًا. هل تريد أيضًا تفعيل الفرع
          <strong>{{ branchLabel(conflict.pendingBranch) }}</strong>؟
        </p>
        <template #actions>
          <AppButton
            variant="secondary"
            @click="$emit('cancel-conflict')"
          >
            إلغاء
          </AppButton>
          <AppButton
            variant="primary"
            @click="$emit('confirm-conflict')"
          >
            متابعة
          </AppButton>
        </template>
      </DialogShell>
    </AppDialog>
  </div>
</template>

<script>
import DialogShell from '../ui/DialogShell.vue';
import { AppButton, AppDialog, AppNativeSelect } from '../ui';

export default {
  name: 'TaskManagementDialogs',
  components: { AppButton, AppDialog, AppNativeSelect, DialogShell },
  props: {
    saveTemplateOpen: { type: Boolean, default: false }, createSubmitting: { type: Boolean, default: false },
    renameOpen: { type: Boolean, default: false }, renameTitle: { type: String, default: '' }, renameSubmitting: { type: Boolean, default: false },
    deleteOpen: { type: Boolean, default: false }, deleteTitle: { type: String, default: '' }, deleteSubmitting: { type: Boolean, default: false },
    availabilityOpen: { type: Boolean, default: false }, managedBranchId: { type: String, default: '' },
    availabilityBranch: { type: String, default: 'all' }, availabilityMinutes: { type: [Number, String], default: 60 },
    availabilitySubmitting: { type: Boolean, default: false }, availabilityError: { type: String, default: '' },
    manageOpen: { type: Boolean, default: false }, manageChoice: { type: String, default: '' }, manageOptions: { type: Array, default: () => [] },
    manageSubmitting: { type: Boolean, default: false }, conflictOpen: { type: Boolean, default: false },
    conflict: { type: Object, default: () => ({ activeBranch: '', pendingBranch: '' }) },
  },
  methods: {
    branchLabel(branch) { return { male: 'معلمين', female: 'معلمات' }[branch] || ''; },
    updateMinutes(value) { this.$emit('update:availability-minutes', value === '' ? '' : Number(value)); },
  },
};
</script>

<style scoped>
.task-dialogs-host { display: contents; }
label { color: #0f172a; font-weight: 800; }
p { margin: 0; color: #4b6478; font-weight: 700; line-height: 2; }
.task-dialog-error { color: #b42318; }
</style>
