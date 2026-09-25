import { createNotification, deleteNotification as deleteNotificationRequest } from '../../services/api';

export const communicationActions = {
  async addNotification({ dispatch }, payload) {
    const result = await createNotification(payload);
    await dispatch('reloadNotifications');
    return result;
  },
  async deleteNotification({ dispatch }, notificationId) {
    await deleteNotificationRequest(notificationId);
    await dispatch('reloadNotifications');
  },
};
