import apiClient from './httpClient';

export const fetchResultsCatalog = async () => (await apiClient.get('/dashboard/results/catalog')).data;
export const fetchResultsPage = async (params, signal) => (await apiClient.get('/dashboard/results', { params, signal })).data;
