import apiClient from './httpClient';

export const fetchTrainingMaterialAttachment = (url) => apiClient.get(url, {
  responseType: 'blob',
  timeout: 120000,
});

export const createTrainingMaterial = async ({ title, description, branchId, attachments }) => {
  const formData = new FormData();

  formData.append('title', title);

  if (description) {
    formData.append('description', description);
  }

  if (branchId) {
    formData.append('branchId', branchId);
  }

  (attachments || []).forEach((attachment, index) => {
    if (attachment?.label) {
      formData.append(`attachments[${index}][label]`, attachment.label);
    }

    if (attachment?.file) {
      formData.append(`attachments[${index}][file]`, attachment.file);
    }

    if (attachment?.url) {
      formData.append(`attachments[${index}][url]`, attachment.url);
    }
  });

  const response = await apiClient.post('/dashboard/training-materials', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export const updateTrainingMaterial = async (materialId, { title, description, branchId, attachments }) => {
  const formData = new FormData();

  formData.append('_method', 'PUT');
  formData.append('title', title);

  if (description) {
    formData.append('description', description);
  }

  if (branchId) {
    formData.append('branchId', branchId);
  }

  (attachments || []).forEach((attachment, index) => {
    if (attachment?.id) {
      formData.append(`attachments[${index}][id]`, attachment.id);
    }

    if (attachment?.label) {
      formData.append(`attachments[${index}][label]`, attachment.label);
    }

    if (attachment?.file) {
      formData.append(`attachments[${index}][file]`, attachment.file);
    }

    if (attachment?.url) {
      formData.append(`attachments[${index}][url]`, attachment.url);
    }
  });

  const response = await apiClient.post(`/dashboard/training-materials/${encodeURIComponent(materialId)}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export const deleteTrainingMaterial = async (materialId) => {
  await apiClient.delete(`/dashboard/training-materials/${encodeURIComponent(materialId)}`);
};
