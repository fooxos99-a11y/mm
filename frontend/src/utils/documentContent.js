export const stripRichTextMarkup = (value) => String(value || '')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/\s+/g, ' ')
  .trim();

export const hasMeaningfulDocumentContent = (value) => stripRichTextMarkup(value).length > 0;

const ALLOWED_TAGS = new Set([
  'a',
  'blockquote',
  'br',
  'code',
  'del',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'img',
  'li',
  'ol',
  'p',
  'pre',
  's',
  'span',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
]);

const ALLOWED_ATTRIBUTES = {
  a: new Set(['href', 'target', 'rel']),
  img: new Set(['src', 'alt', 'style', 'data-width-px', 'data-height-px', 'data-x', 'data-y', 'width', 'height', 'draggable']),
  table: new Set(['style', 'table_id']),
  tr: new Set(['style', 'row_id']),
  td: new Set(['style', 'table_id', 'row_id', 'cell_id', 'merge_id', 'colspan', 'rowspan']),
  th: new Set(['style', 'table_id', 'row_id', 'cell_id', 'merge_id', 'colspan', 'rowspan']),
  '*': new Set(['class', 'style', 'dir']),
};

const SAFE_URL_PATTERN = /^(https?:|mailto:|tel:)/i;
const SAFE_DATA_IMAGE_URL_PATTERN = /^data:image\/(?:png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=\s]+$/i;
const UNSAFE_STYLE_VALUE_PATTERN = /(expression\s*\(|javascript:|vbscript:|data:text\/html|url\s*\()/i;
const ALLOWED_STYLE_PROPERTIES = new Set([
  'background',
  'background-color',
  'border',
  'border-bottom',
  'border-left',
  'border-radius',
  'border-right',
  'border-collapse',
  'border-spacing',
  'border-top',
  'bottom',
  'clear',
  'color',
  'display',
  'direction',
  'float',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'height',
  'left',
  'letter-spacing',
  'line-height',
  'margin',
  'margin-bottom',
  'margin-left',
  'margin-right',
  'margin-top',
  'max-height',
  'max-width',
  'min-height',
  'min-width',
  'object-fit',
  'opacity',
  'overflow',
  'padding',
  'padding-bottom',
  'padding-left',
  'padding-right',
  'padding-top',
  'position',
  'right',
  'text-align',
  'text-decoration',
  'top',
  'transform',
  'vertical-align',
  'white-space',
  'width',
  'word-break',
]);

const isSafeUrl = (value) => {
  const url = String(value || '').trim();

  return SAFE_URL_PATTERN.test(url) || SAFE_DATA_IMAGE_URL_PATTERN.test(url);
};

const sanitizeStyleDeclaration = (value) => String(value || '')
  .split(';')
  .map((declaration) => {
    const separatorIndex = declaration.indexOf(':');

    if (separatorIndex === -1) {
      return '';
    }

    const property = declaration.slice(0, separatorIndex).trim().toLowerCase();
    const propertyValue = declaration.slice(separatorIndex + 1).trim();

    if (!ALLOWED_STYLE_PROPERTIES.has(property) || !propertyValue || UNSAFE_STYLE_VALUE_PATTERN.test(propertyValue)) {
      return '';
    }

    return `${property}: ${propertyValue}`;
  })
  .filter(Boolean)
  .join('; ');

const sanitizeNodeTree = (node, documentRef) => {
  if (node.nodeType === 3) {
    return documentRef.createTextNode(node.textContent || '');
  }

  if (node.nodeType !== 1) {
    return null;
  }

  const tagName = node.tagName.toLowerCase();

  if (!ALLOWED_TAGS.has(tagName)) {
    const fragment = documentRef.createDocumentFragment();
    Array.from(node.childNodes || []).forEach((childNode) => {
      const sanitizedChild = sanitizeNodeTree(childNode, documentRef);
      if (sanitizedChild) {
        fragment.appendChild(sanitizedChild);
      }
    });
    return fragment;
  }

  const cleanNode = documentRef.createElement(tagName);
  const allowedAttributes = new Set([
    ...(ALLOWED_ATTRIBUTES['*'] || []),
    ...(ALLOWED_ATTRIBUTES[tagName] || []),
  ]);

  Array.from(node.attributes || []).forEach((attribute) => {
    const attributeName = attribute.name.toLowerCase();
    const attributeValue = attribute.value || '';

    if (!allowedAttributes.has(attributeName)) {
      return;
    }

    if (attributeName === 'style') {
      const safeStyle = sanitizeStyleDeclaration(attributeValue);

      if (safeStyle) {
        cleanNode.setAttribute('style', safeStyle);
      }

      return;
    }

    if (attributeName === 'class') {
      const safeClassNames = attributeValue
        .split(/\s+/)
        .map((className) => className.trim())
        .filter((className) => /^ql-[a-z0-9_-]+$/i.test(className));

      if (safeClassNames.length) {
        cleanNode.setAttribute('class', safeClassNames.join(' '));
      }

      return;
    }

    if ((attributeName === 'href' || attributeName === 'src') && !isSafeUrl(attributeValue)) {
      return;
    }

    cleanNode.setAttribute(attributeName, attributeValue);
  });

  if (tagName === 'a' && cleanNode.getAttribute('target') === '_blank') {
    cleanNode.setAttribute('rel', 'noopener noreferrer');
  }

  Array.from(node.childNodes || []).forEach((childNode) => {
    const sanitizedChild = sanitizeNodeTree(childNode, documentRef);
    if (sanitizedChild) {
      cleanNode.appendChild(sanitizedChild);
    }
  });

  return cleanNode;
};

export const sanitizeRichTextHtml = (value) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return stripRichTextMarkup(value);
  }

  const template = document.createElement('template');
  template.innerHTML = String(value || '');

  const fragment = document.createDocumentFragment();
  Array.from(template.content.childNodes).forEach((childNode) => {
    const sanitizedChild = sanitizeNodeTree(childNode, document);
    if (sanitizedChild) {
      fragment.appendChild(sanitizedChild);
    }
  });

  const container = document.createElement('div');
  container.appendChild(fragment);
  return container.innerHTML;
};
