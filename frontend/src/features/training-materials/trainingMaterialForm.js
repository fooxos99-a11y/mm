export const ALL_MATERIALS_OPTION_VALUE = '__all_materials__';
export const ADD_MATERIAL_OPTION_VALUE = '__add_material__';

let attachmentDraftCounter = 0;

export const createAttachmentDraft = (overrides = {}) => {
  attachmentDraftCounter += 1;

  return {
    id: `attachment-${attachmentDraftCounter}`,
    label: '',
    file: null,
    existingAttachmentId: '',
    existingFileName: '',
    url: '',
    ...overrides,
  };
};

export const resolveDefaultAttachmentLabel = (file) => {
  const fileName = String(file?.name || '').trim();
  if (!fileName) return '';

  const extensionIndex = fileName.lastIndexOf('.');
  if (extensionIndex <= 0) return fileName;

  return fileName.slice(0, extensionIndex).trim() || fileName;
};
