import { Delta, Quill } from './editorRuntime';

const comparableText = (value, hasList = false) => {
  const normalized = value.normalize('NFC');
  // Word includes list markers in text/plain but Quill stores them as attributes.
  const withoutMarkers = hasList
    ? normalized.replace(/^[ \t\u00A0]*(?:[•·▪◦●○]|[\d٠-٩]+[.)])[ \t\u00A0]+/gm, '')
    : normalized;
  return withoutMarkers.replace(/[\s\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g, '');
};

export default {
  async handleEditorPaste(event) {
    if (event.defaultPrevented || this.disabled || !this.editor || !event.clipboardData) {
      return;
    }

    event.preventDefault();
    const clipboard = event.clipboardData;
    const html = clipboard.getData('text/html') || '';
    let text = clipboard.getData('text/plain') || '';
    if (!html && !text) {
      text = (clipboard.getData('text/uri-list') || '')
        .split(/\r?\n/).filter((line) => !line.startsWith('#')).join('\n');
    }
    text = text.replace(/\r\n?/g, '\n').replace(/\0/g, '');
    const selection = this.getEditablePasteRange();
    const insideTable = this.isSelectionInsideTable(selection);
    const formats = this.editor.getFormat(selection.index);
    let pasted = new Delta();

    if (html) {
      // Normalize Office/Google Docs metadata before sanitizing away their styles.
      const doc = new DOMParser().parseFromString(html, 'text/html');
      this.editor.clipboard.normalizeHTML(doc);
      const sanitized = this.sanitizeEditorHtml(doc.body.innerHTML, { disallowTables: insideTable });
      const template = document.createElement('template');
      template.innerHTML = sanitized;
      template.content.querySelectorAll('img').forEach((image) => {
        if (this.lockImages || insideTable || !image.getAttribute('src')) image.remove();
      });
      pasted = this.editor.clipboard.convert({ html: template.innerHTML, text: '' }, formats);
    }

    const convertedText = pasted.ops.map((op) => typeof op.insert === 'string' ? op.insert : '').join('');
    const image = this.extractImageFile(clipboard);
    if (image && !text.trim() && !convertedText.trim()) {
      if (this.lockImages) return;
      if (insideTable) {
        this.showTableRestrictionToast('image');
        return;
      }
      await this.uploadAndInsertImage(image, selection.index);
      return;
    }

    // Some clipboard producers supply only a letter/space in HTML alongside complete plain text.
    const hasList = pasted.ops.some((op) => op.attributes?.list);
    if (text && (!pasted.length() || !comparableText(convertedText).includes(comparableText(text, hasList)))) {
      pasted = this.editor.clipboard.convert({ text }, formats);
    }
    if (pasted.length()) {
      if (insideTable && /<table\b/i.test(html)) this.showTableRestrictionToast('table');
      if (insideTable && /<img\b/i.test(html)) this.showTableRestrictionToast('image');
      this.insertClipboardDelta(pasted, selection);
    }
  },
  getEditablePasteRange() {
    const selection = this.editor.getSelection(true);
    const index = this.resolveEditableInsertIndex(selection);
    const end = selection ? selection.index + selection.length : index;
    return { index, length: Math.max(0, end - index) };
  },
  insertClipboardDelta(pasted, selection) {
    // One transaction keeps replacements, undo and protected-content checks consistent.
    const replacesDocument = selection.index === 0 && selection.length > 0
      && selection.length === this.editor.getLength() - 1;
    // Select-all excludes Quill's final newline; retaining it can create an empty list item.
    const deleteLength = selection.length + Number(replacesDocument);
    let change = new Delta().retain(selection.index);
    let retainedImages = 0;
    if (this.lockImages && deleteLength) {
      this.editor.getContents(selection.index, deleteLength).ops.forEach((op) => {
        if (op.insert?.image) {
          change = change.retain(1);
          retainedImages += 1;
        } else {
          change = change.delete(typeof op.insert === 'string' ? op.insert.length : 1);
        }
      });
    } else {
      change = change.delete(deleteLength);
    }
    change = change.concat(pasted);
    this.editor.history.cutoff();
    this.editor.updateContents(change, Quill.sources.USER);
    this.editor.history.cutoff();
    this.editor.setSelection(selection.index + retainedImages + pasted.length(), 0, Quill.sources.SILENT);
    this.editor.scrollSelectionIntoView();
  },
};
