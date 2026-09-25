import { fetchTrainingMaterialAttachment } from '../../services/api';
import { AppButton, AppRawButton } from '../../components/ui';
import {
  resolveTrainingMaterialFileName,
  resolveTrainingMaterialPreviewKind,
  resolveTrainingMaterialPreviewSource,
} from '../training-materials/trainingMaterialPreview.mjs';

export default {
  name: 'TrainingMaterialsList',
  components: {
    AppButton,
    AppRawButton,
  },
  props: {
    materials: {
      type: Array,
      default: () => [],
    },
    emptyTitle: {
      type: String,
      default: 'لا توجد مواد متاحة.',
    },
    emptyDescription: {
      type: String,
      default: 'أضف مادة جديدة لتظهر هنا.',
    },
    showDelete: {
      type: Boolean,
      default: false,
    },
    showEdit: {
      type: Boolean,
      default: false,
    },
    previewInDialog: {
      type: Boolean,
      default: false,
    },
    deletingId: {
      type: [String, Number],
      default: '',
    },
  },
  data() {
    return {
      previewDialogOpen: false,
      previewAttachment: null,
      previewObjectUrl: '',
      previewLoading: false,
      previewError: '',
    };
  },
  computed: {
    previewAttachmentName() {
      return this.previewAttachment?.displayName || this.previewAttachment?.originalName || this.previewAttachment?.name || 'معاينة الملف';
    },
    previewKind() {
      return resolveTrainingMaterialPreviewKind(this.previewAttachment);
    },
    previewSource() {
      return resolveTrainingMaterialPreviewSource({
        attachment: this.previewAttachment,
        kind: this.previewKind,
        objectUrl: this.previewObjectUrl,
      });
    },
    previewFileName() {
      return resolveTrainingMaterialFileName(this.previewAttachment);
    },
  },
  beforeUnmount() {
    this.releasePreviewObjectUrl();
  },
  methods: {
    async openPreviewDialog(attachment) {
      if (!this.previewInDialog || !attachment?.url) {
        return;
      }

      this.releasePreviewObjectUrl();
      this.previewLoading = attachment.type === 'file';
      this.previewError = '';
      this.previewAttachment = attachment;
      this.previewDialogOpen = true;

      if (attachment.type !== 'file') {
        return;
      }

      try {
        const response = await fetchTrainingMaterialAttachment(attachment.url);
        const responseBlob = response?.data;
        if (!(responseBlob instanceof Blob)) {
          throw new TypeError('Attachment response is not a Blob.');
        }

        const responseMimeType = String(response.headers?.['content-type'] || responseBlob.type || '').toLowerCase();
        if (responseMimeType.includes('application/json') || responseMimeType.includes('text/html')) {
          throw new TypeError('Attachment response is not a supported file.');
        }

        this.previewObjectUrl = window.URL.createObjectURL(responseBlob);
        this.previewAttachment = {
          ...attachment,
          mimeType: responseMimeType || attachment.mimeType,
          url: this.previewObjectUrl,
        };
      } catch {
        this.previewError = 'تعذر تحميل الملف. حدّث الصفحة ثم حاول مرة أخرى.';
      } finally {
        this.previewLoading = false;
      }
    },
    closePreviewDialog() {
      this.previewDialogOpen = false;
      this.previewAttachment = null;
      this.previewLoading = false;
      this.previewError = '';
      this.releasePreviewObjectUrl();
    },
    releasePreviewObjectUrl() {
      if (this.previewObjectUrl) {
        window.URL.revokeObjectURL(this.previewObjectUrl);
        this.previewObjectUrl = '';
      }
    },
  },
};
