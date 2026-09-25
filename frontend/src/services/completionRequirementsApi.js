import apiClient from './httpClient';

export const fetchCompletionRequirements = async (branchCode) => {
  const response = await apiClient.get(`/dashboard/completion-requirements/${branchCode}`);
  return response.data;
};

export const updateCompletionRequirements = async (branchCode, payload) => {
  const response = await apiClient.put(`/dashboard/completion-requirements/${branchCode}`, payload);
  return response.data;
};

export const closeCompletionResults = async (branchCode) => {
  const response = await apiClient.post(`/dashboard/completion-requirements/${branchCode}/close`);
  return response.data;
};

export const reopenCompletionResults = async (branchCode) => {
  const response = await apiClient.post(`/dashboard/completion-requirements/${branchCode}/reopen`);
  return response.data;
};

export const fetchMyCompletionIndicators = async () => {
  const response = await apiClient.get('/students/me/indicators');
  return response.data;
};
