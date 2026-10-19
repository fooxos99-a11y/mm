import apiClient from './httpClient';

export const fetchAccessHistory = async () => (await apiClient.get('/dashboard/access-history')).data;
