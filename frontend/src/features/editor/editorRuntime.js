import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { IMAGE_EMBED_ATTRIBUTES } from './editorConstants';

const FontFormat = Quill.import('formats/font');
const Delta = Quill.import('delta');
const BaseImageFormat = Quill.import('formats/image');

class RichImageFormat extends BaseImageFormat {
  static formats(domNode) {
    const formats = typeof super.formats === 'function'
      ? super.formats(domNode) || {}
      : {};

    IMAGE_EMBED_ATTRIBUTES.forEach((attributeName) => {
      if (domNode.hasAttribute(attributeName)) {
        formats[attributeName] = domNode.getAttribute(attributeName);
      }
    });

    return formats;
  }

  format(name, value) {
    if (IMAGE_EMBED_ATTRIBUTES.includes(name)) {
      if (value || value === 0 || value === '0') {
        this.domNode.setAttribute(name, String(value));
      } else {
        this.domNode.removeAttribute(name);
      }

      return;
    }

    super.format(name, value);
  }
}

FontFormat.whitelist = [
  'traditional-arabic',
  'simplified-arabic',
  'arabic-typesetting',
  'tahoma',
  'arial',
  'segoe-ui',
];

Quill.register(FontFormat, true);
Quill.register(RichImageFormat, true);

export const createTableKeyboardBindings = () => ({
  enterBeforeTable: {
    key: 'Enter',
    collapsed: true,
    handler(range, keycontext) {
      if (!range || range.length > 0 || keycontext.offset !== 0) {
        return true;
      }

      const [leaf] = this.quill.getLeaf(range.index);
      const domNode = leaf?.domNode?.nodeType === 3
        ? leaf.domNode.parentElement
        : leaf?.domNode;
      const tableCell = domNode?.closest?.('td, th');

      if (!tableCell) {
        return true;
      }

      const tableElement = tableCell.closest('table');
      const firstCell = tableElement?.querySelector('td, th');

      if (!tableElement || firstCell !== tableCell) {
        return true;
      }

      const tableBlot = Quill.find(tableElement, true);

      if (!tableBlot) {
        return true;
      }

      const tableIndex = this.quill.getIndex(tableBlot);

      this.quill.insertText(tableIndex, '\n', Quill.sources.USER);
      this.quill.setSelection(tableIndex, 0, Quill.sources.SILENT);
      return false;
    },
  },
});

export const TABLE_CONTEXT_ACTIONS = [
  {
    value: 'append-row-below',
    label: 'إضافة صف',
  },
  {
    value: 'append-col-after',
    label: 'إضافة عمود',
  },
  {
    value: 'remove-row',
    label: 'إزالة صف',
  },
  {
    value: 'remove-col',
    label: 'إزالة عمود',
  },
  {
    value: 'remove-table',
    label: 'حذف الجدول',
    danger: true,
  },
];

export const replaceNodeWithText = (node, documentRef) => {
  if (!node?.parentNode) {
    return;
  }

  node.parentNode.replaceChild(documentRef.createTextNode(node.textContent || ''), node);
};

export { Delta, Quill };
