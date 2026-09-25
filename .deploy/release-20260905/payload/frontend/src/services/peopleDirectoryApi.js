import apiClient from './httpClient';

export const fetchPeopleDirectory = async (params, signal) => {
  const response = await apiClient.get('/dashboard/people', { params, signal });
  return response.data;
};

export const fetchPeopleOptions = async (params, signal) => {
  const response = await apiClient.get('/dashboard/people/options', { params, signal });
  return response.data;
};

export const fetchPersonDetail = async (type, id) => {
  const response = await apiClient.get(`/dashboard/people/${type}/${encodeURIComponent(id)}`);
  return response.data;
};
