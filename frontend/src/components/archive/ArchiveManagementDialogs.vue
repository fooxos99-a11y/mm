<template>
  <div>
    <AppDialog
      :value="createOpen"
      max-width="520"
      @input="$emit('update:create-open', $event)"
      @close="$emit('create-close')"
    >
      <div class="archive-dialog">
        <AppDialogHeader title="إضافة أرشيف جديد" />
        <AppDialogBody>
          <div class="archive-dialog__field">
            <label
              for="archive-create-name"
              class="archive-dialog__label"
            >اسم الأرشيف</label>
            <input
              id="archive-create-name"
              :value="archiveName"
              type="text"
              class="archive-dialog__input"
              placeholder="مثال: الدفعة الأولى"
              @input="$emit('update:archive-name', $event.target.value.trimStart())"
              @keyup.enter="$emit('create')"
            >
          </div>
          <div class="archive-dialog__field">
            <label
              for="archive-create-courses-count"
              class="archive-dialog__label"
            >عدد الدورات</label>
            <input
              id="archive-create-courses-count"
              :value="coursesCount"
              type="number"
              min="0"
              step="1"
              inputmode="numeric"
              class="archive-dialog__input"
              placeholder="0"
              @input="$emit('update:courses-count', Number($event.target.value))"
              @keyup.enter="$emit('create')"
            >
          </div>
          <BatchTypeField
            field-id="archive-create-batch-type"
            :value="batchType"
            :options="batchTypeOptions"
            @input="$emit('update:batch-type', $event)"
          />
        </AppDialogBody>
        <AppDialogFooter class="archive-dialog__footer">
          <AppButton
            variant="secondary"
            @click="$emit('create-close')"
          >
            إلغاء
          </AppButton>
          <AppButton
            variant="primary"
            :loading="saving"
            :disabled="!archiveName.trim()"
            @click="$emit('create')"
          >
            إضافة
          </AppButton>
        </AppDialogFooter>
      </div>
    </AppDialog>

    <AppDialog
      :value="deleteOpen"
      max-width="460"
      @input="$emit('update:delete-open', $event)"
      @close="$emit('delete-close')"
    >
      <div class="archive-dialog">
        <AppDialogHeader title="تأكيد حذف الأرشيف" />
        <AppDialogBody>
          <p class="archive-dialog__confirm-text">
            هل تريد حذف الأرشيف
            <strong>{{ deleteArchiveName }}</strong>؟
          </p>
          <p class="archive-dialog__danger-note">
            سيُحذف الأرشيف وجميع بياناته نهائيًا، ولا يمكن التراجع عن هذه العملية.
          </p>
        </AppDialogBody>
        <AppDialogFooter class="archive-dialog__footer">
          <AppButton
            variant="secondary"
            :disabled="deleting"
            @click="$emit('delete-close')"
          >
            إلغاء
          </AppButton>
          <AppButton
            variant="danger"
            :loading="deleting"
            @click="$emit('delete-confirm')"
          >
            حذف نهائيًا
          </AppButton>
        </AppDialogFooter>
      </div>
    </AppDialog>

    <AppDialog
      :value="archiveAllOpen"
      max-width="620"
      @input="$emit('update:archive-all-open', $event)"
      @close="$emit('archive-all-close')"
    >
      <div class="archive-dialog">
        <AppDialogHeader title="أرشفة المحتوى الحالي" />
        <AppDialogBody>
          <div class="archive-dialog__field">
            <label
              for="archive-all-name"
              class="archive-dialog__label"
            >اسم الأرشيف</label>
            <input
              id="archive-all-name"
              :value="archiveAllName"
              type="text"
              class="archive-dialog__input"
              placeholder="مثال: الدفعة الأولى 1447"
              @input="$emit('update:archive-all-name', $event.target.value.trimStart())"
              @keyup.enter="$emit('archive-all')"
            >
          </div>
          <BatchTypeField
            field-id="archive-all-batch-type"
            :value="archiveAllBatchType"
            :options="batchTypeOptions"
            @input="$emit('update:archive-all-batch-type', $event)"
          />
        </AppDialogBody>
        <AppDialogFooter class="archive-dialog__footer">
          <AppButton
            variant="secondary"
            @click="$emit('archive-all-close')"
          >
            إلغاء
          </AppButton>
          <AppButton
            variant="primary"
            :loading="saving"
            :disabled="!archiveAllName.trim()"
            @click="$emit('archive-all')"
          >
            أرشفة
          </AppButton>
        </AppDialogFooter>
      </div>
    </AppDialog>

    <AppDialog
      :value="studentOpen"
      max-width="620"
      @input="$emit('update:student-open', $event)"
      @close="$emit('student-close')"
    >
      <div class="archive-dialog">
        <AppDialogHeader title="إضافة طالب إلى الأرشيف" />
        <AppDialogBody>
          <div class="archive-dialog__field">
            <label
              for="archive-student-name"
              class="archive-dialog__label"
            >اسم الطالب</label>
            <input
              id="archive-student-name"
              :value="studentName"
              type="text"
              class="archive-dialog__input"
              placeholder="اكتب اسم الطالب"
              @input="$emit('update:student-name', $event.target.value.trimStart())"
              @keyup.enter="$emit('student-add')"
            >
          </div>
        </AppDialogBody>
        <AppDialogFooter class="archive-dialog__footer">
          <AppButton
            variant="secondary"
            @click="$emit('student-close')"
          >
            إلغاء
          </AppButton>
          <AppButton
            variant="primary"
            :loading="saving"
            :disabled="!studentName.trim()"
            @click="$emit('student-add')"
          >
            إضافة
          </AppButton>
        </AppDialogFooter>
      </div>
    </AppDialog>
  </div>
</template>

<script>
import {
  AppButton, AppDialog, AppDialogBody, AppDialogFooter, AppDialogHeader,
} from '../ui';
import BatchTypeField from './BatchTypeField.vue';

export default {
  name: 'ArchiveManagementDialogs',
  components: {
    AppButton, AppDialog, AppDialogBody, AppDialogFooter, AppDialogHeader, BatchTypeField,
  },
  props: {
    createOpen: { type: Boolean, default: false },
    archiveName: { type: String, default: '' },
    coursesCount: { type: Number, default: 0 },
    batchType: { type: String, required: true },
    batchTypeOptions: { type: Array, required: true },
    saving: { type: Boolean, default: false },
    deleteOpen: { type: Boolean, default: false },
    deleteArchiveName: { type: String, default: '' },
    deleting: { type: Boolean, default: false },
    archiveAllOpen: { type: Boolean, default: false },
    archiveAllName: { type: String, default: '' },
    archiveAllBatchType: { type: String, required: true },
    studentOpen: { type: Boolean, default: false },
    studentName: { type: String, default: '' },
  },
  emits: [
    'update:create-open',
    'create-close',
    'update:archive-name',
    'create',
    'update:courses-count',
    'update:batch-type',
    'update:delete-open',
    'delete-close',
    'delete-confirm',
    'update:archive-all-open',
    'archive-all-close',
    'update:archive-all-name',
    'archive-all',
    'update:archive-all-batch-type',
    'update:student-open',
    'student-close',
    'update:student-name',
    'student-add',
  ],
};
</script>
