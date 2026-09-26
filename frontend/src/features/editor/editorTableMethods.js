import { Quill } from './editorRuntime';

const getImageBlotIndex = (editor, imageElement) => {
  const imageBlot = editor ? Quill.find(imageElement, true) : null;
  return imageBlot && editor ? editor.getIndex(imageBlot) : -1;
};

export default {
    handleEditorClick(event) {
      this.hideTableContextMenu();

      const imageElement = event.target?.closest?.('img');

      if (!imageElement) {
        this.clearSelectedImage();
        return;
      }

      if (this.lockImages) {
        this.clearSelectedImage();
        const imageIndex = getImageBlotIndex(this.editor, imageElement);

        if (this.editor && imageIndex >= 0) {
          this.editor.setSelection(imageIndex + 1, 0, Quill.sources.SILENT);
        }

        return;
      }

      if (this.isProtectedIndex(getImageBlotIndex(this.editor, imageElement))) {
        this.clearSelectedImage();
        this.ensureSelectionOutsideProtected();
        return;
      }

      this.setSelectedImage(imageElement);
    },
    handleEditorPointerDown(event) {
      this.hideTableContextMenu();

      const imageElement = event.target?.closest?.('img');

      if (!imageElement || this.disabled || event.button !== 0) {
        return;
      }

      if (this.lockImages) {
        event.preventDefault();
        this.clearSelectedImage();
        return;
      }

      if (this.isProtectedIndex(getImageBlotIndex(this.editor, imageElement))) {
        event.preventDefault();
        this.clearSelectedImage();
        this.ensureSelectionOutsideProtected();
        return;
      }

      event.preventDefault();
      this.setSelectedImage(imageElement);
      this.startImageDrag(event);
    },
    handleImageFramePointerDown(event) {
      if (this.lockImages || this.disabled || !this.selectedImage || event.button !== 0) {
        return;
      }

      if (event.target?.closest?.('.rich-text-editor__image-handle')) {
        return;
      }

      this.startImageDrag(event);
    },
    handleSelectionChange(range) {
      if (range && this.doesRangeTouchProtected(range)) {
        this.clearSelectedImage();
        this.ensureSelectionOutsideProtected();
        return;
      }

      if (range) {
        this.rememberSelection(range);
      }

      if (!range || !this.editor || this.selectedImage) {
        return;
      }

      const [leaf] = this.editor.getLeaf(range.index);

      if (leaf?.domNode?.tagName === 'IMG') {
        if (this.lockImages) {
          this.clearSelectedImage();
          this.editor.setSelection(range.index + 1, 0, Quill.sources.SILENT);
          return;
        }

        this.setSelectedImage(leaf.domNode);
      }
    },
    handleToolbarPointerDown(event) {
      if (this.disabled || !this.editor) {
        return;
      }

      const toolbarButton = event.target?.closest?.('button');

      if (!toolbarButton || !this.$refs.toolbar?.contains(toolbarButton)) {
        return;
      }

      event.preventDefault();
      this.restoreLastSelection();
    },
    handleTableContextMenu(event) {
      if (this.disabled || !this.editor) {
        return;
      }

      const tableElement = event.target?.closest?.('table');

      if (!tableElement || !this.editor.root.contains(tableElement)) {
        this.hideTableContextMenu();
        return;
      }

      event.preventDefault();
      this.clearSelectedImage();

      const targetCell = event.target?.closest?.('td, th') || tableElement.querySelector('td, th');
      const blot = targetCell ? Quill.find(targetCell, true) : null;

      if (blot) {
        const index = this.editor.getIndex(blot);

        if (this.isProtectedIndex(index)) {
          this.hideTableContextMenu();
          this.ensureSelectionOutsideProtected();
          return;
        }

        this.editor.focus();
        this.editor.setSelection(index, 0, Quill.sources.SILENT);
      }

      this.openTableContextMenu(event);
    },
    openTableContextMenu(event) {
      const surfaceRect = this.$refs.surface?.getBoundingClientRect();

      if (!surfaceRect) {
        return;
      }

      const menuWidth = 220;
      const menuHeight = (this.tableContextActions.length * 42) + 20;
      const nextLeft = Math.max(12, Math.min(event.clientX - surfaceRect.left, surfaceRect.width - menuWidth - 12));
      const nextTop = Math.max(12, Math.min(event.clientY - surfaceRect.top, surfaceRect.height - menuHeight - 12));

      this.tableContextMenu = {
        visible: true,
        top: nextTop,
        left: nextLeft,
      };
    },
    hideTableContextMenu() {
      if (!this.tableContextMenu.visible) {
        return;
      }

      this.tableContextMenu = {
        visible: false,
        top: 0,
        left: 0,
      };
    },
    handleTableContextAction(actionValue) {
      if (!this.editor || !actionValue) {
        return;
      }

      this.runTableAction(actionValue);
      this.hideTableContextMenu();
      this.editor.focus();
    },
    handleWindowPointerDown(event) {
      if (!this.tableContextMenu.visible) {
        return;
      }

      if (this.$refs.tableContextMenu?.contains(event.target)) {
        return;
      }

      this.hideTableContextMenu();
    },
    handleViewportChange() {
      this.updateSelectedImageFrame();
      this.hideTableContextMenu();
    },
    resolveLeafForIndex(index) {
      if (!this.editor) {
        return null;
      }

      const maxIndex = Math.max(this.editor.getLength() - 1, 0);
      const safeIndex = Math.max(0, Math.min(index, maxIndex));
      let [leaf] = this.editor.getLeaf(safeIndex);

      if (!leaf && safeIndex > 0) {
        [leaf] = this.editor.getLeaf(safeIndex - 1);
      }

      return leaf || null;
    },
    resolveTableForIndex(index) {
      const leaf = this.resolveLeafForIndex(index);
      const domNode = leaf?.domNode?.nodeType === Node.TEXT_NODE
        ? leaf.domNode.parentElement
        : leaf?.domNode;

      return domNode?.closest?.('table') || null;
    },
    resolveIndexAfterCurrentTable(range = this.editor?.getSelection(true)) {
      if (!this.editor || !range) {
        return null;
      }

      const tableElement = this.resolveTableForIndex(range.index);

      if (!tableElement) {
        return null;
      }

      const tableBlot = Quill.find(tableElement, true);

      if (!tableBlot) {
        return null;
      }

      let resolvedIndex = this.editor.getIndex(tableBlot) + tableBlot.length();
      const maxIndex = Math.max(0, this.editor.getLength() - 1);

      while (resolvedIndex <= maxIndex && this.resolveTableForIndex(resolvedIndex)) {
        resolvedIndex += 1;
      }

      if (resolvedIndex > maxIndex) {
        const appendIndex = this.editor.getLength() - 1;
        this.editor.insertText(appendIndex, '\n', Quill.sources.SILENT);
        resolvedIndex = this.editor.getLength() - 1;
      }

      const protectedBoundaryIndex = this.getEffectiveProtectedBoundary();
      return Math.max(protectedBoundaryIndex, resolvedIndex);
    },
    isInsertIndexInsideTable(index) {
      if (!Number.isInteger(index)) {
        return this.isSelectionInsideTable();
      }

      return Boolean(this.resolveTableForIndex(index));
    },
    isSelectionInsideTable(range = this.editor?.getSelection(true)) {
      if (!this.editor || !range) {
        return false;
      }

      const startTable = this.resolveTableForIndex(range.index);
      const endIndex = Math.max(range.index, range.index + Math.max(range.length - 1, 0));
      const endTable = this.resolveTableForIndex(endIndex);

      return Boolean(startTable || endTable);
    },
    showTableRestrictionToast(type) {
      if (typeof this.$toast?.error !== 'function') {
        return;
      }

      if (type === 'table') {
        this.$toast.error('لا يمكن إدراج جدول داخل جدول آخر');
        return;
      }

      this.$toast.error('لا يمكن إدراج صورة داخل الجدول');
    },
};
