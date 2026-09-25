import apiClient from './httpClient';

export const reportClientError = (payload) => apiClient.post('/client-errors', payload);
