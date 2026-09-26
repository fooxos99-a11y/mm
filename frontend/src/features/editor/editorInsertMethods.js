import { uploadEditorImage } from '../../services/api';
import { Quill } from './editorRuntime';

const findBlotForNode = (node) => (node ? Quill.find(node, true) : null);

// Uses the standard caretPositionFromPoint API (Chromium 128+, Safari 18.2+, Firefox).
const findBlotAtPoint = (x, y) => {
  if (typeof document.caretPositionFromPoint !== 'function') {
    return null;
  }

  return findBlotForNode(document.caretPositionFromPoint(x, y)?.offsetNode);
};

export default {
    openImagePicker() {
      if (this.lockImages || this.disabled || this.isUploadingImage || !this.$refs.imageInput) {
        return;
      }

      const editableInsertIndex = this.resolveEditableInsertIndex();

      this.editor.focus();
      this.editor.setSelection(editableInsertIndex, 0, Quill.sources.SILENT);

      if (this.isSelectionInsideTable()) {
        this.showTableRestrictionToast('image');
        return;
      }

      this.$refs.imageInput.value = '';
      this.$refs.imageInput.click();
    },
    runTableAction(value) {
      if (!value || !this.editor) {
        return false;
      }

      const match = /^newtable_(\d+)_(\d+)$/.exec(value);
      const tableModule = this.editor.getModule('table');

      if (!match || typeof tableModule?.insertTable !== 'function') {
        return false;
      }

      tableModule.insertTable(Number(match[1]), Number(match[2]));
      return true;
    },
    handleTableToolbarAction(value) {
      if (!value || !this.editor) {
        return;
      }

      const editableInsertIndex = this.resolveEditableInsertIndex();

      this.editor.focus();
      this.editor.setSelection(editableInsertIndex, 0, Quill.sources.SILENT);

      if (value.startsWith('newtable_')) {
        const selection = this.editor.getSelection(true);
        const shouldRelocateSelection = !selection || this.isSelectionInsideTable(selection);

        if (shouldRelocateSelection) {
          const protectedBoundaryIndex = this.getEffectiveProtectedBoundary();
          const tableExitIndex = Math.max(
            protectedBoundaryIndex,
            Math.max(0, this.editor.getLength() - 1),
          );

          this.editor.focus();
          this.editor.setSelection(tableExitIndex, 0, Quill.sources.SILENT);
          window.requestAnimationFrame(() => {
            this.runTableAction(value);
          });
          return;
        }
      }

      this.runTableAction(value);
    },
    async handleImageSelection(event) {
      if (this.lockImages) {
        return;
      }

      const [file] = event?.target?.files || [];

      if (!file || !this.editor) {
        return;
      }

      await this.uploadAndInsertImage(file);
    },
    async uploadAndInsertImage(file, insertIndex = null) {
      if (!this.editor || this.isUploadingImage) {
        return;
      }

      this.isUploadingImage = true;

      try {
        const { url } = await uploadEditorImage(file);
        const selection = this.editor.getSelection(true);
        const preferredInsertIndex = Number.isInteger(insertIndex)
          ? insertIndex
          : this.resolveEditableInsertIndex(selection);
        const protectedBoundaryIndex = this.getEffectiveProtectedBoundary();
        const resolvedInsertIndex = Math.max(protectedBoundaryIndex, preferredInsertIndex);

        if (this.isInsertIndexInsideTable(resolvedInsertIndex)) {
          this.showTableRestrictionToast('image');
          return;
        }

        this.editor.insertEmbed(resolvedInsertIndex, 'image', url, 'user');
        this.editor.setSelection(resolvedInsertIndex + 1, 0, 'silent');
        this.$nextTick(() => {
          const [leaf] = this.editor.getLeaf(resolvedInsertIndex);

          if (leaf?.domNode?.tagName === 'IMG') {
            this.prepareImageElement(leaf.domNode);
            this.persistImageMetrics(leaf.domNode);
            this.setSelectedImage(leaf.domNode);
          }

          this.emitEditorValue();
        });

        if (typeof this.$toast?.success === 'function') {
          this.$toast.success('تم رفع الصورة');
        }
      } catch (error) {
        if (typeof this.$toast?.error === 'function') {
          this.$toast.error(error?.response?.data?.message || 'تعذر رفع الصورة');
        }
      } finally {
        this.isUploadingImage = false;

        if (this.$refs.imageInput) {
          this.$refs.imageInput.value = '';
        }
      }
    },
    handleSurfaceDragOver(event) {
      if (this.lockImages || this.disabled || !this.extractImageFile(event.dataTransfer)) {
        return;
      }

      this.isDragOver = true;
    },
    handleSurfaceDragLeave(event) {
      if (event.currentTarget?.contains(event.relatedTarget)) {
        return;
      }

      this.isDragOver = false;
    },
    async handleSurfaceDrop(event) {
      if (this.lockImages || this.disabled) {
        return;
      }

      const imageFile = this.extractImageFile(event.dataTransfer);

      this.isDragOver = false;

      if (!imageFile) {
        return;
      }

      this.editor.focus();
      await this.uploadAndInsertImage(imageFile, this.resolveDropInsertIndex(event));
    },
    async handleEditorPaste(event) {
      if (this.disabled) {
        return;
      }

      const selectionIsInsideTable = this.isSelectionInsideTable();
      const imageFile = this.extractImageFile(event.clipboardData);

      if (imageFile) {
        event.preventDefault();
        if (this.lockImages) {
          return;
        }

        if (selectionIsInsideTable) {
          this.showTableRestrictionToast('image');
          return;
        }

        await this.uploadAndInsertImage(imageFile);
        return;
      }

      const html = event.clipboardData?.getData('text/html') || '';

      if (!html) {
        return;
      }

      const containsTableMarkup = /<table\b/i.test(html);
      const containsImageMarkup = /<img\b/i.test(html);

      if (!selectionIsInsideTable && !containsTableMarkup && !containsImageMarkup) {
        return;
      }

      event.preventDefault();

      if (selectionIsInsideTable && containsTableMarkup) {
        this.showTableRestrictionToast('table');
      }

      if (selectionIsInsideTable && containsImageMarkup) {
        this.showTableRestrictionToast('image');
      }

      const sanitizedHtml = this.sanitizeEditorHtml(html, {
        disallowTables: selectionIsInsideTable,
      });
      const plainText = event.clipboardData?.getData('text/plain') || '';

      if (sanitizedHtml) {
        this.insertHtmlAtSelection(sanitizedHtml);
        return;
      }

      if (plainText) {
        this.insertTextAtSelection(plainText);
      }
    },
    insertHtmlAtSelection(html) {
      if (!this.editor || !html) {
        return;
      }

      const sanitizedHtml = this.sanitizeEditorHtml(html);

      if (!sanitizedHtml) {
        return;
      }

      const selection = this.editor.getSelection(true);
      const insertIndex = selection ? selection.index : this.editor.getLength();

      if (selection?.length) {
        this.editor.deleteText(selection.index, selection.length, Quill.sources.USER);
      }

      this.editor.clipboard.dangerouslyPasteHTML(insertIndex, sanitizedHtml, Quill.sources.USER);
    },
    insertTextAtSelection(value) {
      if (!this.editor || !value) {
        return;
      }

      const selection = this.editor.getSelection(true);
      const insertIndex = selection ? selection.index : this.editor.getLength();

      if (selection?.length) {
        this.editor.deleteText(selection.index, selection.length, Quill.sources.USER);
      }

      this.editor.insertText(insertIndex, value, Quill.sources.USER);
      this.editor.setSelection(insertIndex + value.length, 0, Quill.sources.SILENT);
    },
    extractImageFile(source) {
      const items = Array.from(source?.items || []);
      const files = items
        .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
        .map((item) => item.getAsFile())
        .filter(Boolean);

      if (files.length > 0) {
        return files[0];
      }

      return Array.from(source?.files || []).find((file) => file.type.startsWith('image/')) || null;
    },
    resolveDropInsertIndex(event) {
      if (!this.editor) {
        return 0;
      }

      const caretBlot = findBlotAtPoint(event.clientX, event.clientY);

      if (caretBlot) {
        return this.editor.getIndex(caretBlot);
      }

      const targetBlot = Quill.find(event.target, true);

      if (targetBlot) {
        const targetIndex = this.editor.getIndex(targetBlot);

        return targetBlot.domNode?.tagName === 'IMG' ? targetIndex + 1 : targetIndex;
      }

      const selection = this.editor.getSelection(true);

      return selection ? selection.index : this.editor.getLength();
    },
};
