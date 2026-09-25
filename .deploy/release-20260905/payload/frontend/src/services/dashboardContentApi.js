import apiClient from './httpClient';

export const updateHomePageContent = async (content) => {
  const response = await apiClient.put('/dashboard/home-page-content', { content });
  return response.data;
};

export const updatePractitionerPageContent = async (content) => {
  const response = await apiClient.put('/dashboard/practitioner-page-content', { content });
  return response.data;
};

export const createTaskTemplate = async ({ name, content }) => {
  const response = await apiClient.post('/dashboard/task-templates', { name, content });
  return response.data;
};

export const updateTaskTemplate = (templateId, { name, content }) => apiClient.put(
  `/dashboard/task-templates/${templateId}`,
  {
    ...(name !== undefined ? { name } : {}),
    ...(content !== undefined ? { content } : {}),
  },
);

export const uploadEditorImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await apiClient.post('/dashboard/editor-images', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
