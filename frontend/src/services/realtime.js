import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { resolveApiBaseUrl } from './api';

let echoInstance = null;

const hasRealtimeConfig = () => Boolean(process.env.VUE_APP_PUSHER_APP_KEY);

const buildPusherOptions = () => ({
  broadcaster: 'pusher',
  key: process.env.VUE_APP_PUSHER_APP_KEY,
  cluster: process.env.VUE_APP_PUSHER_APP_CLUSTER || 'mt1',
  wsHost: process.env.VUE_APP_PUSHER_HOST || undefined,
  wsPort: Number(process.env.VUE_APP_PUSHER_PORT || 443),
  wssPort: Number(process.env.VUE_APP_PUSHER_PORT || 443),
  forceTLS: (process.env.VUE_APP_PUSHER_SCHEME || 'https') === 'https',
  enabledTransports: ['ws', 'wss'],
  authEndpoint: `${resolveApiBaseUrl()}/broadcasting/auth`,
});

const ensureEcho = () => {
  if (!hasRealtimeConfig()) {
    return null;
  }

  if (!echoInstance) {
    window.Pusher = Pusher;
    echoInstance = new Echo(buildPusherOptions());
  }

  return echoInstance;
};

export const subscribeDashboardRealtime = ({ user, ...handlers } = {}) => {
  const echo = ensureEcho();

  const role = user?.role || '';
  if (!echo || !['admin', 'male_manager', 'female_manager'].includes(role)) {
    return () => {};
  }

  const channelNames = role === 'admin'
    ? ['dashboard.notifications.all', 'dashboard.notifications.male', 'dashboard.notifications.female', 'dashboard.notifications.admin']
    : [
      'dashboard.notifications.all',
      `dashboard.notifications.${role === 'female_manager' ? 'female' : 'male'}`,
    ];
  if (!user?.departmentId) return () => {};
  const scopedChannelNames = channelNames.map(name => `departments.${user.departmentId}.${name}`);
  const notificationChannels = scopedChannelNames.map((name) => echo.private(name));

  notificationChannels.forEach((channel) => {
    channel.listen('.dashboard.notification.created', ({ notification }) => {
      handlers.onNotificationCreated?.(notification);
    });

    channel.listen('.dashboard.notification.deleted', ({ notificationId }) => {
      handlers.onNotificationDeleted?.(notificationId);
    });
  });

  return () => {
    scopedChannelNames.forEach((name) => echo.leave(name));
  };
};

export const disconnectDashboardRealtime = () => {
  if (!echoInstance) {
    return;
  }

  echoInstance.disconnect();
  echoInstance = null;
};
