import apiClient from './httpClient';

export const previewStudentImport = async payload => (await apiClient.post('/students/import/preview', payload, { timeout: 60000 })).data;
export const commitStudentImport = async payload => (await apiClient.post('/students/import', payload, { timeout: 180000 })).data;
