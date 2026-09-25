export const normalizeSelectItemSlotProps = (slotProps = {}) => {
  const internalItem = slotProps.item || null;

  return {
    ...slotProps,
    internalItem,
    item: internalItem?.raw ?? internalItem,
    attrs: slotProps.props || {},
    on: {},
  };
};
