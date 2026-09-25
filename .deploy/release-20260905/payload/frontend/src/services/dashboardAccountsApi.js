import apiClient from './httpClient';

export const fetchDashboardAccounts = async () => {
  const response = await apiClient.get('/dashboard/accounts');

  return response.data;
};

export const createDashboardAccount = async (payload) => {
  const response = await apiClient.post('/dashboard/accounts', payload);

  return response.data;
};

export const deleteDashboardAccount = async (accountId) => {
  await apiClient.delete(`/dashboard/accounts/${encodeURIComponent(accountId)}`);
};
