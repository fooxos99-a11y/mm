import apiClient, { publicApiClient } from './httpClient';

export const fetchRegistrationDashboardData = async () => {
  const response = await apiClient.get('/dashboard/registration');

  return response.data;
};

export const updateRegistrationSettings = async (isOpen) => {
  await apiClient.put('/dashboard/registration/settings', { isOpen });
};

export const updateRegistrationFields = async (fields) => {
  const response = await apiClient.put('/dashboard/registration/fields', { fields });

  return response.data;
};

export const acceptRegistrationRequest = async (requestId, payload) => {
  const response = await apiClient.post(`/dashboard/registration-requests/${encodeURIComponent(requestId)}/accept`, payload);

  return response.data;
};

export const rejectRegistrationRequest = async (requestId, reason = '') => {
  const response = await apiClient.post(`/dashboard/registration-requests/${encodeURIComponent(requestId)}/reject`, { reason });

  return response.data;
};

export const markRegistrationRequestAccepted = async (requestId) => {
  const response = await apiClient.post(`/dashboard/registration-requests/${encodeURIComponent(requestId)}/mark-accepted`);

  return response.data;
};

export const fetchPublicRegistrationStatus = async () => {
  const response = await publicApiClient.get('/public/registration');

  return response.data;
};

export const submitPublicRegistrationRequest = async (payload) => {
  const response = await publicApiClient.post('/public/registration-requests', payload);

  return response.data;
};
