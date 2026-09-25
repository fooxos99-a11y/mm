import axios from 'axios';
import { createHttpClientOptions, resolveApiBaseUrlValue } from './httpPolicy.mjs';

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

export const initializeCsrfProtection = () => sessionClient.get('/sanctum/csrf-cookie');

export default apiClient;
