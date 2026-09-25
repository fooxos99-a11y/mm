import apiClient from './httpClient';

export const createNotification = async (payload) => {
  const response = await apiClient.post('/dashboard/notifications', payload);
  return response.data;
};

export const deleteNotification = (notificationId) => apiClient.delete(
  `/dashboard/notifications/${notificationId}`,
);

export const setRolePermission = ({ role, key, isEnabled }) => apiClient.put(
  '/dashboard/role-permissions',
  { role, key, isEnabled },
);
