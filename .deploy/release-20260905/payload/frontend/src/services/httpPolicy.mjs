export const resolveApiBaseUrlValue = ({
  configuredBaseUrl = '',
  location = null,
  publicBaseUrl = '/',
} = {}) => {
  if (configuredBaseUrl) return configuredBaseUrl;
  if (!location) return 'http://localhost:8000/api';

  const host = location.hostname || 'localhost';
  const isLocalHost = host === '127.0.0.1' || host === 'localhost';
  if (isLocalHost && location.port && !['8000', '8001'].includes(location.port)) {
    return `http://${host}:8001/api`;
  }

  const publicBasePath = publicBaseUrl.replace(/\/$/, '');
  const apiPathPrefix = publicBasePath && publicBasePath !== '/' ? publicBasePath : '';
  return `${location.origin}${apiPathPrefix}/api`;
};

export const createHttpClientOptions = (baseURL, timeout = 12000) => ({
  baseURL,
  timeout,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  withXSRFToken: true,
});
