import createSingleFlight from '../utils/createSingleFlight.mjs';
import { currentAuthRequestKey } from './authApi';
import apiClient from './httpClient';
import { loadCompleteSnapshot } from './completeSnapshot.mjs';

const fetchDashboardSnapshotOnce = createSingleFlight();
const fetchNotificationsOnce = createSingleFlight();
const fetchDashboardShellOnce = createSingleFlight();

export const fetchDashboardShell = () => fetchDashboardShellOnce(async () => {
  const response = await apiClient.get('/dashboard/shell');
  return response.data;
}, currentAuthRequestKey());

export const fetchDashboardSnapshot = () => fetchDashboardSnapshotOnce(() => loadCompleteSnapshot(async (page) => {
  const response = await apiClient.get('/dashboard/snapshot', { params: { page } });
  return response.data;
}), currentAuthRequestKey());

export const fetchNotifications = () => fetchNotificationsOnce(async () => {
  const response = await apiClient.get('/dashboard/notifications');
  return response.data;
}, currentAuthRequestKey());
