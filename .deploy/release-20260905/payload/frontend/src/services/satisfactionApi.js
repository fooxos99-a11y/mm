import apiClient from './httpClient';

export const createSatisfactionQuestion = async (payload) => {
  const response = await apiClient.post('/dashboard/satisfaction-questions', payload);
  return response.data;
};

export const deleteSatisfactionQuestion = (questionId) => apiClient.delete(
  `/dashboard/satisfaction-questions/${questionId}`,
);

export const submitPublicSatisfactionResponses = async (responses) => {
  const response = await apiClient.post('/public/satisfaction-responses', { responses });
  return response.data;
};

export const submitSatisfactionResponses = async (responses) => {
  const response = await apiClient.post('/dashboard/satisfaction-responses', { responses });
  return response.data;
};
