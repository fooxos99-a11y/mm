import { mapActions, mapState } from 'vuex';
import {
  AppButton,
  AppCard,
  AppFilterField,
  AppFilterToolbar,
  AppDialog,
  AppDialogBody,
  AppDialogFooter,
  AppDialogHeader,
  AppRawButton,
  AppSelect,
} from '../../components/ui';
import TrainingMaterialsList from '../../components/TrainingMaterialsList.vue';
import { createTrainingMaterial, deleteTrainingMaterial, updateTrainingMaterial } from '../../services/api';
import computed from '../training-materials/adminTrainingMaterialsComputed';
import { validateTrainingAttachmentSizes, resolveTrainingUploadError } from '../training-materials/trainingMaterialUpload.mjs';
import { canUseDashboardPermission } from '../permissions/permissionAccess.mjs';
import {
  ADD_MATERIAL_OPTION_VALUE,
  ALL_MATERIALS_OPTION_VALUE,
  createAttachmentDraft,
  resolveDefaultAttachmentLabel,
} from '../training-materials/trainingMaterialForm';

export default {
  name: 'AdminTrainingMaterialsView',
  components: {
    AppButton,
    AppCard,
    AppFilterField,
    AppFilterToolbar,
    AppDialog,
    AppDialogBody,
    AppDialogFooter,
    AppDialogHeader,
    AppRawButton,
    AppSelect,
    TrainingMaterialsList,
  },
  props: {
    embedded: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      dialogOpen: false,
      dialogMode: 'create',
      editingMaterialId: '',
      selectedMaterialId: ALL_MATERIALS_OPTION_VALUE,
      materialSelectResetKey: 0,
      submitting: false,
      uploadPercent: null,
      deletingId: '',
      formError: '',
      form: {
        title: '',
        branchId: 'all',
        description: '',
        attachments: [createAttachmentDraft()],
      },
    };
  },
  computed: {
    ...mapState(['dashboardSnapshot', 'currentUser']),
    canManageMaterials() { return canUseDashboardPermission(this.currentUser, this.dashboardSnapshot, 'manage_materials'); },
    ...computed,
  },
  watch: {
    trainingMaterials: {
      immediate: true,
      handler(nextMaterials) {
        if (!nextMaterials.length) {
          this.selectedMaterialId = ALL_MATERIALS_OPTION_VALUE;
          return;
        }

        if (!this.selectedMaterialId || this.selectedMaterialId === ADD_MATERIAL_OPTION_VALUE) {
          this.selectedMaterialId = ALL_MATERIALS_OPTION_VALUE;
          return;
        }

        if (this.selectedMaterialId !== ALL_MATERIALS_OPTION_VALUE
          && !nextMaterials.some((material) => material.id === this.selectedMaterialId)) {
          this.selectedMaterialId = ALL_MATERIALS_OPTION_VALUE;
        }
      },
    },
  },
  methods: {
    ...mapActions(['loadDashboardSnapshot']),
    openCreateDialog() {
      this.dialogMode = 'create';
      this.editingMaterialId = '';
      this.formError = '';
      this.resetForm();
      this.dialogOpen = true;
    },
    openEditDialog(material = this.selectedMaterial) {
      if (!material || material.canManage === false) {
        return;
      }

      this.dialogMode = 'edit';
      this.editingMaterialId = material.id;
      this.formError = '';
      this.form = {
        title: material.title || '',
        branchId: material.targetBranchId || 'all',
        description: material.description || '',
        attachments: (material.attachments || []).map((attachment) => createAttachmentDraft({
          label: attachment.type === 'youtube'
            ? (attachment.url || '')
            : (attachment.displayName || attachment.originalName || attachment.name || ''),
          existingAttachmentId: attachment.id || '',
          existingFileName: attachment.type === 'youtube' ? '' : (attachment.originalName || attachment.name || ''),
          url: attachment.type === 'youtube' ? (attachment.url || '') : '',
        })),
      };

      if (!this.form.attachments.length) {
        this.form.attachments = [createAttachmentDraft()];
      }

      this.dialogOpen = true;
    },
    closeDialog() {
      if (this.submitting) return;
      this.dialogOpen = false;
      this.resetForm();
      this.dialogMode = 'create';
      this.editingMaterialId = '';
      this.formError = '';
      if (this.selectedMaterialId === ADD_MATERIAL_OPTION_VALUE) {
        this.selectedMaterialId = ALL_MATERIALS_OPTION_VALUE;
      }
      this.materialSelectResetKey += 1;
    },
    addAttachmentRow() {
      this.form.attachments.push(createAttachmentDraft());
    },
    removeAttachmentRow(index) {
      this.form.attachments.splice(index, 1);
    },
    handleAttachmentFileChange(index, event) {
      const [file] = Array.from(event?.target?.files || []);

      if (!this.form.attachments[index]) {
        return;
      }

      this.form.attachments[index].file = file || null;

      if (!file) {
        return;
      }

      this.form.attachments[index].existingAttachmentId = '';
      this.form.attachments[index].existingFileName = '';
      this.form.attachments[index].url = '';

      const currentLabel = String(this.form.attachments[index].label || '').trim();

      if (!currentLabel) {
        this.form.attachments[index].label = resolveDefaultAttachmentLabel(file);
      }
    },
    normalizedAttachments() {
      return this.form.attachments
        .map((attachment) => {
          const value = String(attachment.label || '').trim();
          const url = this.normalizeYoutubeUrl(value);

          return {
            id: String(attachment.existingAttachmentId || '').trim(),
            label: url ? 'مقطع يوتيوب' : (value || resolveDefaultAttachmentLabel(attachment.file)),
            file: attachment.file || null,
            url,
          };
        })
        .filter((attachment) => attachment.id || attachment.label || attachment.file || attachment.url);
    },
    isYoutubeUrl(value) {
      return /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)\//i.test(String(value || '').trim());
    },
    normalizeYoutubeUrl(value) {
      const url = String(value || '').trim();

      if (!this.isYoutubeUrl(url)) {
        return '';
      }

      return /^https?:\/\//i.test(url) ? url : `https://${url}`;
    },
    resolveRequestError(error) {
      return resolveTrainingUploadError(error);
    },
    resetForm() {
      this.form = {
        title: '',
        branchId: { male_manager: 'male', female_manager: 'female' }[this.currentUser?.role] || 'all',
        description: '',
        attachments: [createAttachmentDraft()],
      };
    },
    async submitMaterial() {
      if (this.submitting) return;
      this.formError = '';
      const attachments = this.normalizedAttachments();

      const sizeError = validateTrainingAttachmentSizes(attachments);
      if (sizeError) {
        this.formError = sizeError;
        this.$toast.error(sizeError);
        return;
      }

      if (!this.form.title || !attachments.length) {
        this.formError = 'أدخل العنوان وأضف ملفًا أو رابط يوتيوب واحدًا على الأقل.';
        this.$toast.error(this.formError);
        return;
      }

      const hasIncompleteAttachment = attachments.some((attachment) => !attachment.label
        || (!attachment.id && !attachment.file && !attachment.url));

      if (hasIncompleteAttachment) {
        this.formError = 'أدخل اسم الملف واختر ملفًا، أو ألصق رابط يوتيوب صحيحًا.';
        this.$toast.error(this.formError);
        return;
      }

      this.submitting = true;
      this.uploadPercent = null;

      try {
        const payload = {
          title: this.form.title,
          description: this.form.description,
          branchId: this.form.branchId,
          attachments,
          onUploadProgress: ({ loaded, total }) => {
            this.uploadPercent = total ? Math.min(100, Math.round(loaded * 100 / total)) : null;
          },
        };

        const isEditMode = this.dialogMode === 'edit' && this.editingMaterialId;
        const successMessage = isEditMode
          ? 'تم تحديث المادة التدريبية'
          : 'تمت إضافة المادة التدريبية';
        const result = isEditMode
          ? await updateTrainingMaterial(this.editingMaterialId, payload)
          : await createTrainingMaterial(payload);

        await this.loadDashboardSnapshot();
        this.selectedMaterialId = isEditMode
          ? (result?.id || this.selectedMaterialId)
          : ALL_MATERIALS_OPTION_VALUE;
        this.submitting = false;
        this.closeDialog();
        this.$toast.success(successMessage);
      } catch (error) {
        this.formError = this.resolveRequestError(error);
        this.$toast.error(this.formError);
      } finally {
        this.submitting = false;
      }
    },
    async removeMaterial(materialId) {
      if (!materialId) {
        return;
      }

      this.deletingId = materialId;

      try {
        await deleteTrainingMaterial(materialId);
        await this.loadDashboardSnapshot();
        this.$toast.success('تم حذف المادة التدريبية');
      } catch (error) {
        this.$toast.error(error?.response?.data?.message || 'تعذر حذف المادة التدريبية');
      } finally {
        this.deletingId = '';
      }
    },
  },
};
