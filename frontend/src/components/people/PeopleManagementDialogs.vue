<template>
  <div>
    <AppDialog
      :value="partsOpen"
      max-width="560"
      @input="$emit('parts-toggle', $event)"
    >
      <div class="people-dialog people-parts-dialog">
        <AppDialogBody class="people-parts-dialog__body">
          <div class="people-parts-dialog__header">
            <AppRawButton
              type="button"
              class="people-parts-dialog__close-button"
              aria-label="إغلاق"
              @click="$emit('parts-close')"
            >
              ×
            </AppRawButton>
            <div class="people-parts-dialog__title">
              الأجزاء المقروءة
            </div>
            <span
              class="people-parts-dialog__header-spacer"
              aria-hidden="true"
            />
          </div>

          <div class="people-parts-dialog__grid">
            <AppRawButton
              v-for="part in parts"
              :key="part"
              type="button"
              class="people-parts-dialog__circle"
              :class="{ 'people-parts-dialog__circle--active': isPartCompleted(part) }"
              :disabled="!canManageParts || savingPartKey === `${partsStudentId}:${part}`"
              :aria-pressed="isPartCompleted(part) ? 'true' : 'false'"
              @click="$emit('part-toggle', part)"
            >
              {{ part }}
            </AppRawButton>
          </div>
        </AppDialogBody>
      </div>
    </AppDialog>

    <AppDialog
      :value="deleteOpen"
      max-width="460"
      @input="$emit('delete-toggle', $event)"
    >
      <div class="people-dialog people-confirm-dialog">
        <AppDialogHeader
          class="people-dialog__header"
          title="تأكيد الحذف"
          title-tag="h2"
        />
        <AppDialogBody compact>
          <p class="people-confirm-dialog__text">
            هل تريد حذف {{ deleteTypeLabel }}
            <strong>{{ deleteName }}</strong>؟
          </p>
        </AppDialogBody>
        <AppDialogFooter class="people-dialog__actions">
          <AppButton
            variant="danger"
            class="people-dialog__submit people-dialog__submit--danger"
            :disabled="deleteSubmitting"
            @click="$emit('delete-confirm')"
          >
            {{ deleteSubmitting ? 'جارٍ الحذف...' : 'حذف' }}
          </AppButton>
          <AppButton
            variant="secondary"
            class="people-dialog__cancel"
            :disabled="deleteSubmitting"
            @click="$emit('delete-close')"
          >
            إلغاء
          </AppButton>
        </AppDialogFooter>
      </div>
    </AppDialog>

    <AppDialog
      :value="reciterOpen"
      max-width="520"
      @input="$emit('reciter-toggle', $event)"
    >
      <div class="people-dialog people-reciter-dialog">
        <AppDialogHeader
          class="people-dialog__header"
          title="اختر المقرئ"
          title-tag="h2"
        />
        <div class="people-dialog__divider" />
        <AppDialogBody
          class="people-dialog__form people-reciter-dialog__form"
          compact
        >
          <div class="people-dialog__field">
            <label
              class="people-dialog__label"
              for="people-manage-reciter"
            >اختر المقرئ/ة</label>
            <PeopleRemotePicker
              v-if="reciterOpen"
              input-id="people-manage-reciter"
              type="reciter"
              :branch="reciterBranch"
              label="البحث عن مقرئ للإسناد"
              :current-label="reciterLabel"
              :selected-ids="[reciterId]"
              :disabled="reciterSaving"
              :allow-empty="allowUnassign"
              @select="$emit('update:reciter-id', $event)"
            />
          </div>
        </AppDialogBody>
        <AppDialogFooter class="people-dialog__actions">
          <AppButton
            variant="secondary"
            class="people-dialog__cancel"
            :disabled="reciterSaving"
            @click="$emit('reciter-close')"
          >
            إلغاء
          </AppButton>
          <AppButton
            variant="primary"
            class="people-dialog__submit"
            :disabled="reciterSaving"
            @click="$emit('reciter-submit')"
          >
            حفظ
          </AppButton>
        </AppDialogFooter>
      </div>
    </AppDialog>

    <AppDialog
      :value="manageOpen"
      max-width="640"
      @input="$emit('manage-toggle', $event)"
    >
      <div class="people-dialog people-manage-dialog">
        <AppDialogHeader
          class="people-dialog__header"
          title="إدارة المستخدمين"
          title-tag="h2"
        />
        <div class="people-dialog__divider" />
        <AppDialogBody
          compact
          class="people-dialog__form people-manage-dialog__form"
        >
          <div class="people-dialog__field">
            <label
              class="people-dialog__label"
              for="people-manage-entity-type"
            >اختر النوع</label>
            <AppSelect
              id="people-manage-entity-type"
              :value="manageEntityType"
              :items="entityOptions"
              item-text="label"
              item-value="value"
              dense
              outlined
              hide-details
              :menu-props="selectMenuProps"
              class="people-dialog__select"
              @input="$emit('update:manage-entity-type', $event)"
              @change="$emit('manage-context-change')"
            />
          </div>
          <div class="people-dialog__field">
            <label
              class="people-dialog__label"
              for="people-manage-branch"
            >اختر الفرع</label>
            <AppSelect
              id="people-manage-branch"
              :value="manageBranchId"
              :items="branchOptions"
              item-text="label"
              item-value="value"
              dense
              outlined
              hide-details
              :menu-props="selectMenuProps"
              class="people-dialog__select"
              @input="$emit('update:manage-branch-id', $event)"
              @change="$emit('manage-context-change')"
            />
          </div>
          <div
            v-if="!directCardEdit"
            class="people-dialog__field"
          >
            <label
              class="people-dialog__label"
              for="people-manage-target"
            >{{ manageTargetLabel }}</label>
            <PeopleRemotePicker
              v-if="manageOpen"
              input-id="people-manage-target"
              :type="manageEntityType"
              :branch="manageBranchId"
              :label="manageTargetLabel"
              :selected-ids="[manageTargetId]"
              :disabled="manageSubmitting"
              @select="$emit('update:manage-target-id', $event)"
            />
          </div>
        </AppDialogBody>
        <AppDialogFooter class="people-dialog__actions">
          <AppButton
            variant="secondary"
            class="people-dialog__submit people-dialog__submit--manage"
            :disabled="!canManageSelected || manageSubmitting"
            @click="$emit('manage-edit')"
          >
            تعديل البيانات
          </AppButton>
          <AppButton
            variant="danger"
            class="people-dialog__submit people-dialog__submit--danger"
            :disabled="!canManageSelected || manageSubmitting"
            @click="$emit('manage-delete')"
          >
            {{ manageSubmitting ? 'جارٍ الحذف...' : 'حذف' }}
          </AppButton>
          <AppButton
            variant="secondary"
            class="people-dialog__cancel"
            :disabled="manageSubmitting"
            @click="$emit('manage-close')"
          >
            إلغاء
          </AppButton>
        </AppDialogFooter>
      </div>
    </AppDialog>
  </div>
</template>

<script>
import PeopleRemotePicker from './PeopleRemotePicker.vue';
import {
  AppButton, AppDialog, AppDialogBody, AppDialogFooter, AppDialogHeader, AppRawButton, AppSelect,
} from '../ui';

export default {
  name: 'PeopleManagementDialogs',
  components: {
    PeopleRemotePicker,
    AppButton, AppDialog, AppDialogBody, AppDialogFooter, AppDialogHeader, AppRawButton, AppSelect,
  },
  props: {
    reciterBranch: { type: String, default: 'male' },
    allowUnassign: Boolean,
    reciterLabel: { type: String, default: '' },
    partsOpen: { type: Boolean, default: false },
    parts: { type: Array, required: true },
    partsStudentId: { type: String, default: '' },
    savingPartKey: { type: String, default: '' },
    canManageParts: { type: Boolean, default: false },
    isPartCompleted: { type: Function, required: true },
    deleteOpen: { type: Boolean, default: false },
    deleteTypeLabel: { type: String, default: '' },
    deleteName: { type: String, default: '' },
    deleteSubmitting: { type: Boolean, default: false },
    reciterOpen: { type: Boolean, default: false },
    reciterId: { type: String, default: '' },
    reciterOptions: { type: Array, required: true },
    reciterSaving: { type: Boolean, default: false },
    manageOpen: { type: Boolean, default: false },
    manageEntityType: { type: String, required: true },
    entityOptions: { type: Array, required: true },
    manageBranchId: { type: String, required: true },
    branchOptions: { type: Array, required: true },
    directCardEdit: { type: Boolean, default: false },
    manageTargetLabel: { type: String, default: '' },
    manageTargetId: { type: String, default: '' },
    manageTargetOptions: { type: Array, required: true },
    selectMenuProps: { type: Object, required: true },
    canManageSelected: { type: Boolean, default: false },
    manageSubmitting: { type: Boolean, default: false },
  },
  emits: [
    'delete-close',
    'delete-confirm',
    'delete-toggle',
    'manage-close',
    'manage-context-change',
    'manage-delete',
    'manage-edit',
    'manage-toggle',
    'part-toggle',
    'parts-close',
    'parts-toggle',
    'reciter-close',
    'reciter-submit',
    'reciter-toggle',
    'update:manage-branch-id',
    'update:manage-entity-type',
    'update:manage-target-id',
    'update:reciter-id',
  ],
};
</script>
