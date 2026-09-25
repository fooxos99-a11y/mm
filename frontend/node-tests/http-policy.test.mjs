import assert from 'node:assert/strict';
import test from 'node:test';
import { createHttpClientOptions, resolveApiBaseUrlValue } from '../src/services/httpPolicy.mjs';

test('API URL policy handles configured, server, local development and hosted paths', () => {
  assert.equal(resolveApiBaseUrlValue({ configuredBaseUrl: 'https://api.example.test' }), 'https://api.example.test');
  assert.equal(resolveApiBaseUrlValue(), 'http://localhost:8000/api');
  assert.equal(resolveApiBaseUrlValue({
    location: { hostname: 'localhost', port: '8080', origin: 'http://localhost:8080' },
  }), 'http://localhost:8001/api');
  assert.equal(resolveApiBaseUrlValue({
    location: { hostname: '127.0.0.1', port: '8000', origin: 'http://127.0.0.1:8000' },
  }), 'http://127.0.0.1:8000/api');
  assert.equal(resolveApiBaseUrlValue({
    location: { hostname: 'example.test', port: '', origin: 'https://example.test' },
    publicBaseUrl: '/momars/',
  }), 'https://example.test/momars/api');
  assert.equal(resolveApiBaseUrlValue({
    location: { hostname: '', port: '', origin: 'https://example.test' },
  }), 'https://example.test/api');
});

test('HTTP clients share secure session and JSON defaults', () => {
  assert.deepEqual(createHttpClientOptions('/api', 5000), {
    baseURL: '/api',
    timeout: 5000,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    withCredentials: true,
    withXSRFToken: true,
  });
  assert.equal(createHttpClientOptions('/api').timeout, 12000);
});
