export const normalizeVuetifyFieldAttrs = (attrs = {}) => {
  const normalized = { ...attrs };

  const legacyItemText = normalized.itemText ?? normalized['item-text'];
  if (legacyItemText !== undefined && normalized.itemTitle === undefined && normalized['item-title'] === undefined) {
    normalized.itemTitle = legacyItemText;
  }

  delete normalized.itemText;
  delete normalized['item-text'];

  if (normalized.dense !== undefined && normalized.density === undefined) {
    normalized.density = normalized.dense === false ? 'default' : 'compact';
  }

  delete normalized.dense;

  if (normalized.outlined !== undefined && normalized.variant === undefined) {
    normalized.variant = normalized.outlined === false ? 'filled' : 'outlined';
  }

  delete normalized.outlined;

  return normalized;
};
