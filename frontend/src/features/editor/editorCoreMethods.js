import { markRaw } from 'vue';
import { Quill, createTableKeyboardBindings, replaceNodeWithText } from './editorRuntime';
import { sanitizeRichTextHtml } from '../../utils/documentContent';

export default {
    initializeEditor() {
      const resolvedPlaceholder = typeof this.placeholder === 'string' && this.placeholder.length > 0
        ? this.placeholder
        : ' ';

      // Quill's document and selection objects must retain their identity outside Vue proxies.
      this.editor = markRaw(new Quill(this.$refs.editor, {
        theme: 'snow',
        placeholder: resolvedPlaceholder,
        modules: {
          toolbar: {
            container: this.$refs.toolbar,
            handlers: {
              image: () => this.openImagePicker(),
              table: (value) => this.handleTableToolbarAction(value),
              undo: () => this.editor.history.undo(),
            },
          },
          table: true,
          history: {
            delay: 500,
          },
          keyboard: {
            bindings: createTableKeyboardBindings(),
          },
        },
      }));

      this.editor.root.setAttribute('dir', 'rtl');
      this.editor.root.setAttribute('lang', 'ar');
      this.editor.root.setAttribute('role', 'textbox');
      this.editor.root.setAttribute('aria-label', 'محتوى المستند');
      this.editor.root.setAttribute('aria-multiline', 'true');
      const fontPicker = this.$refs.toolbar.querySelector('.ql-font.ql-picker');
      fontPicker?.querySelector('.ql-picker-label')?.setAttribute('aria-label', 'اختيار الخط');
      fontPicker?.querySelectorAll('.ql-picker-item').forEach((item) => {
        item.setAttribute('aria-label', item.getAttribute('data-label') || 'الخط الافتراضي');
      });
      this.setEditorHtml(this.sanitizeEditorHtml(this.value || ''));
      this.updateProtectedBoundary();
      this.editor.enable(!this.disabled);
      this.imageInteractionMoveListener = (event) => this.handleImageInteractionMove(event);
      this.imageInteractionStopListener = () => this.stopImageInteraction();
      this.toolbarPointerDownListener = (event) => this.handleToolbarPointerDown(event);
      this.editor.root.addEventListener('click', this.handleEditorClick);
      this.editor.root.addEventListener('pointerdown', this.handleEditorPointerDown);
      this.editor.root.addEventListener('paste', this.handleEditorPaste);
      this.editor.root.addEventListener('contextmenu', this.handleTableContextMenu);
      this.$refs.toolbar?.addEventListener('pointerdown', this.toolbarPointerDownListener, true);
      window.addEventListener('resize', this.handleViewportChange);
      window.addEventListener('scroll', this.handleViewportChange, true);
      window.addEventListener('pointerdown', this.handleWindowPointerDown, true);

      this.editor.on('text-change', this.handleEditorTextChange);
      this.editor.on('selection-change', this.handleSelectionChange);
    },
    rememberSelection(range) {
      if (!range) {
        return;
      }

      this.lastSelectionRange = {
        index: range.index,
        length: range.length || 0,
      };
    },
    restoreLastSelection() {
      if (!this.editor || !this.lastSelectionRange) {
        return;
      }

      this.editor.focus();
      this.editor.setSelection(
        this.lastSelectionRange.index,
        this.lastSelectionRange.length || 0,
        Quill.sources.SILENT,
      );
    },
    sanitizeEditorHtml(value, options = {}) {
      const { disallowTables = false } = options;
      const sanitizedHtml = sanitizeRichTextHtml(value || '');

      if (typeof document === 'undefined') {
        return sanitizedHtml;
      }

      const template = document.createElement('template');
      template.innerHTML = sanitizedHtml;

      Array.from(template.content.querySelectorAll('table img')).forEach((imageNode) => {
        imageNode.remove();
      });

      const tableSelector = disallowTables ? 'table' : 'table table';
      Array.from(template.content.querySelectorAll(tableSelector)).forEach((tableNode) => {
        replaceNodeWithText(tableNode, document);
      });

      const container = document.createElement('div');
      container.appendChild(template.content);
      return container.innerHTML;
    },
    setEditorHtml(value) {
      if (!this.editor) {
        return;
      }

      this.editor.clipboard.dangerouslyPasteHTML(value || '');
      this.$nextTick(() => {
        this.refreshEditorImages();
        this.updateProtectedBoundary();
        this.ensureEditableTailForProtectedContent();
        this.ensureSelectionOutsideProtected();
      });
    },
    calculateProtectedBoundary() {
      if (!this.editor) {
        return 0;
      }

      const sanitizedProtectedContent = this.sanitizeEditorHtml(this.protectedContent || '');

      if (!sanitizedProtectedContent) {
        return 0;
      }

      const protectedDelta = this.editor.clipboard.convert({ html: sanitizedProtectedContent });
      return Math.max(0, protectedDelta.length());
    },
    updateProtectedBoundary() {
      this.protectedBoundaryIndex = this.calculateProtectedBoundary();
    },
    getEffectiveProtectedBoundary() {
      return this.allowProtectedEditing ? 0 : this.protectedBoundaryIndex;
    },
    ensureEditableTailForProtectedContent() {
      const protectedBoundaryIndex = this.getEffectiveProtectedBoundary();

      if (!this.editor || protectedBoundaryIndex <= 0) {
        return;
      }

      if (this.editor.getLength() <= protectedBoundaryIndex) {
        this.editor.insertText(this.editor.getLength() - 1, '\n', Quill.sources.SILENT);
      }
    },
    isProtectedIndex(index) {
      if (this.allowProtectedEditing) {
        return false;
      }

      return this.protectedBoundaryIndex > 0 && Number.isFinite(index) && index < this.protectedBoundaryIndex;
    },
    doesRangeTouchProtected(range) {
      if (this.allowProtectedEditing) {
        return false;
      }

      if (!range || this.protectedBoundaryIndex <= 0) {
        return false;
      }

      const rangeEnd = range.index + Math.max(range.length, 0);
      return range.index < this.protectedBoundaryIndex || rangeEnd < this.protectedBoundaryIndex;
    },
    ensureSelectionOutsideProtected() {
      if (this.allowProtectedEditing) {
        return;
      }

      if (!this.editor || this.protectedBoundaryIndex <= 0) {
        return;
      }

      const selection = this.editor.getSelection();

      if (!selection || !this.doesRangeTouchProtected(selection)) {
        return;
      }

      this.editor.setSelection(this.protectedBoundaryIndex, 0, Quill.sources.SILENT);
    },
    resolveEditableInsertIndex(range = this.editor?.getSelection(true)) {
      if (!this.editor) {
        return 0;
      }

      const protectedBoundaryIndex = this.getEffectiveProtectedBoundary();

      const preferredIndex = Number.isFinite(range?.index)
        ? range.index
        : Math.max(0, this.editor.getLength() - 1);

      return Math.max(protectedBoundaryIndex, preferredIndex);
    },
    doesDeltaModifyProtectedContent(delta) {
      if (this.allowProtectedEditing) {
        return false;
      }

      if (!delta?.ops?.length || this.protectedBoundaryIndex <= 0) {
        return false;
      }

      let documentIndex = 0;

      return delta.ops.some((operation) => {
        if (typeof operation.retain === 'number') {
          const retainStart = documentIndex;
          const retainEnd = documentIndex + operation.retain;
          documentIndex = retainEnd;

          return Boolean(
            operation.attributes
            && retainStart < this.protectedBoundaryIndex
            && retainEnd > 0,
          );
        }

        if (operation.insert !== undefined) {
          return documentIndex < this.protectedBoundaryIndex;
        }

        if (typeof operation.delete === 'number') {
          const deleteStart = documentIndex;
          documentIndex += operation.delete;

          return deleteStart < this.protectedBoundaryIndex;
        }

        return false;
      });
    },
    collectImageEmbedSignatures(delta) {
      if (!delta?.ops?.length) {
        return [];
      }

      const signatures = [];

      delta.ops.forEach((operation) => {
        if (typeof operation.insert === 'string') {
          return;
        }

        if (operation.insert && typeof operation.insert === 'object' && operation.insert.image) {
          signatures.push({
            src: String(operation.insert.image || ''),
            width: operation.attributes?.['data-width-px'] || null,
            height: operation.attributes?.['data-height-px'] || null,
            x: operation.attributes?.['data-x'] || null,
            y: operation.attributes?.['data-y'] || null,
          });
        }
      });

      return signatures;
    },
    didUserModifyImages(previousDelta) {
      if (!this.editor || !previousDelta) {
        return false;
      }

      const previousImages = this.collectImageEmbedSignatures(previousDelta);
      const nextImages = this.collectImageEmbedSignatures(this.editor.getContents());

      return JSON.stringify(previousImages) !== JSON.stringify(nextImages);
    },
    handleEditorTextChange(delta, oldDelta, source) {
      if (this.isApplyingExternalValue) {
        return;
      }

      if (source === Quill.sources.USER && this.lockImages && this.didUserModifyImages(oldDelta)) {
        this.isApplyingExternalValue = true;
        this.editor.setContents(oldDelta, Quill.sources.SILENT);
        this.$nextTick(() => {
          this.refreshEditorImages();
          this.updateProtectedBoundary();
          this.ensureEditableTailForProtectedContent();
          this.ensureSelectionOutsideProtected();
          this.isApplyingExternalValue = false;
        });
        return;
      }

      if (source === Quill.sources.USER && this.doesDeltaModifyProtectedContent(delta)) {
        this.isApplyingExternalValue = true;
        this.editor.setContents(oldDelta, Quill.sources.SILENT);
        this.$nextTick(() => {
          this.refreshEditorImages();
          this.updateProtectedBoundary();
          this.ensureSelectionOutsideProtected();
          this.isApplyingExternalValue = false;
        });
        return;
      }

      this.$nextTick(() => {
        this.refreshEditorImages();
        this.updateSelectedImageFrame();
        this.updateProtectedBoundary();
        this.ensureEditableTailForProtectedContent();
        this.ensureSelectionOutsideProtected();
      });

      if (source === Quill.sources.USER) {
        this.emitEditorValue();
      }
    },
};
