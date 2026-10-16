import { publicApiClient } from './httpClient';
import { publicDepartmentParams } from './departmentContext';
import { loadCompleteSnapshot } from './completeSnapshot.mjs';

export const fetchPublicSnapshot = () => loadCompleteSnapshot(async (page) => {
  const response = await publicApiClient.get('/public/snapshot', { params: { page, ...publicDepartmentParams() } });

  return response.data;
});

export const fetchPublicStats = async () => {
  const response = await publicApiClient.get('/public/stats', { params: publicDepartmentParams() });

  return response.data;
};
