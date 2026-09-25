export const resolveTrainingMaterialPreviewKind = (attachment = null) => {
  if (attachment?.type === 'youtube' && attachment?.embedUrl) {
    return 'youtube';
  }

  const mimeType = String(attachment?.mimeType || '').toLowerCase();
  const fileName = String(attachment?.originalName || attachment?.name || '').toLowerCase();

  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';

  if (mimeType === 'application/pdf'
    || mimeType.startsWith('text/')
    || /\.(pdf|txt|md|csv)$/i.test(fileName)) {
    return 'document';
  }

  return 'other';
};

export const resolveTrainingMaterialPreviewSource = ({
  attachment = null,
  kind = 'other',
  objectUrl = '',
} = {}) => (kind === 'youtube' ? attachment?.embedUrl || '' : objectUrl);

export const resolveTrainingMaterialFileName = (attachment = null) => (
  attachment?.originalName || attachment?.name || 'ملف'
);
