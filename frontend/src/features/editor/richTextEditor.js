import { AppRawButton, AppSelect } from '../../components/ui';
import { TABLE_CONTEXT_ACTIONS } from './editorRuntime';
import coreMethods from './editorCoreMethods';
import imageMethods from './editorImageMethods';
import insertMethods from './editorInsertMethods';
import clipboardMethods from './editorClipboardMethods';
import interactionMethods from './editorInteractionMethods';
import tableMethods from './editorTableMethods';

export default {
  name: 'RichTextEditor',
  components: { AppSelect, AppRawButton },
  emits: ['input'],
  props: {
    value: { type: String, default: '' },
    protectedContent: { type: String, default: '' },
    placeholder: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    lockImages: { type: Boolean, default: false },
    allowProtectedEditing: { type: Boolean, default: false },
    minHeight: { type: String, default: '320px' },
  },
  data() {
    return {
      editor: null,
      selectedFont: '',
      fontOptions: [
        { title: 'الخط', value: '' },
        { title: 'العربي التقليدي', value: 'traditional-arabic' },
        { title: 'العربي المبسط', value: 'simplified-arabic' },
        { title: 'صف الحروف العربي', value: 'arabic-typesetting' },
        { title: 'تاهوما', value: 'tahoma' },
        { title: 'آريال', value: 'arial' },
        { title: 'سيغو UI', value: 'segoe-ui' },
      ],
      isApplyingExternalValue: false,
      isUploadingImage: false,
      isDragOver: false,
      selectedImage: null,
      selectedImageFrame: null,
      imageInteraction: null,
      pendingImageInteractionPoint: null,
      imageInteractionFrameRequest: null,
      imageInteractionMoveListener: null,
      imageInteractionStopListener: null,
      toolbarPointerDownListener: null,
      lastSelectionRange: null,
      protectedBoundaryIndex: 0,
      tableContextMenu: { visible: false, top: 0, left: 0 },
    };
  },
  computed: {
    editorStyle() { return { '--rich-text-editor-min-height': this.minHeight }; },
    imageHandles() { return ['nw', 'ne', 'sw', 'se']; },
    selectedImageFrameStyle() {
      if (!this.selectedImageFrame) return null;
      return {
        top: `${this.selectedImageFrame.top}px`,
        left: `${this.selectedImageFrame.left}px`,
        width: `${this.selectedImageFrame.width}px`,
        height: `${this.selectedImageFrame.height}px`,
      };
    },
    tableContextActions() { return TABLE_CONTEXT_ACTIONS; },
    tableContextMenuStyle() {
      if (!this.tableContextMenu.visible) return null;
      return { top: `${this.tableContextMenu.top}px`, left: `${this.tableContextMenu.left}px` };
    },
  },
  watch: {
    value(nextValue) {
      if (!this.editor || this.isApplyingExternalValue) return;
      const sanitizedValue = this.sanitizeEditorHtml(nextValue || '');
      if (this.sanitizeEditorHtml(this.editor.root.innerHTML) === sanitizedValue) return;
      this.isApplyingExternalValue = true;
      this.setEditorHtml(sanitizedValue);
      this.$nextTick(() => { this.isApplyingExternalValue = false; });
    },
    disabled(nextValue) { if (this.editor) this.editor.enable(!nextValue); },
    protectedContent() {
      if (!this.editor) return;
      this.updateProtectedBoundary();
      this.ensureEditableTailForProtectedContent();
      this.ensureSelectionOutsideProtected();
      this.clearSelectedImage();
    },
  },
  mounted() { this.initializeEditor(); },
  beforeUnmount() { this.destroyEditor(); },
  methods: {
    ...coreMethods,
    ...insertMethods,
    ...clipboardMethods,
    ...tableMethods,
    ...imageMethods,
    ...interactionMethods,
    handleSelectionChange(range) {
      tableMethods.handleSelectionChange.call(this, range);
      if (range && this.editor) {
        const font = this.editor.getFormat(range).font;
        this.selectedFont = typeof font === 'string' ? font : '';
      }
    },
    applyEditorFont(value) {
      if (!this.editor || this.disabled) return;
      this.restoreLastSelection();
      this.ensureSelectionOutsideProtected();
      this.editor.format('font', value || false, 'user');
      this.selectedFont = value;
    },
  },
};
