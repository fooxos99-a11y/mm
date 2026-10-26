import axios from 'axios';
import { createHttpClientOptions, resolveApiBaseUrlValue } from './httpPolicy.mjs';
import { createSessionBoundary } from './sessionBoundary.mjs';

const API_REQUEST_TIMEOUT_MS = 12000;

export const resolveApiBaseUrl = () => resolveApiBaseUrlValue({
  configuredBaseUrl: process.env.VUE_APP_API_BASE_URL,
  location: typeof window === 'undefined' ? null : window.location,
  publicBaseUrl: process.env.BASE_URL || '/',
});

const apiBaseUrl = resolveApiBaseUrl();
const applicationBaseUrl = apiBaseUrl.replace(/\/api\/?$/, '');

const clientOptions = createHttpClientOptions(apiBaseUrl, API_REQUEST_TIMEOUT_MS);

export const apiClient = axios.create(clientOptions);
export const publicApiClient = axios.create(clientOptions);

const sessionClient = axios.create({
  ...clientOptions,
  baseURL: applicationBaseUrl,
});

const sessionBoundary = createSessionBoundary();
for (const client of [apiClient, publicApiClient, sessionClient]) {
  client.interceptors.request.use(sessionBoundary.beforeRequest);
  client.interceptors.response.use((response) => {
    sessionBoundary.settle(response.config);
    return response;
  }, (error) => {
    sessionBoundary.settle(error.config);
    return Promise.reject(error);
  });
}

export const withSessionMutation = sessionBoundary.runExclusive;
export const initializeCsrfProtection = (config) => sessionClient.get('/sanctum/csrf-cookie', config);

export default apiClient;
