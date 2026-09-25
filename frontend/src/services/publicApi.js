import { publicApiClient } from './httpClient';
import { loadCompleteSnapshot } from './completeSnapshot.mjs';

export const fetchPublicSnapshot = () => loadCompleteSnapshot(async (page) => {
  const response = await publicApiClient.get('/public/snapshot', { params: { page } });

  return response.data;
});

export const fetchPublicStats = async () => {
  const response = await publicApiClient.get('/public/stats');

  return response.data;
};
