import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readService = (name) => readFile(new URL(`../src/services/${name}`, import.meta.url), 'utf8');

test('the API entry point delegates requests to domain services', async () => {
  const source = await readService('api.js');
  const domains = [
    'assessmentApi',
    'communicationsApi',
    'completionRequirementsApi',
    'coursesApi',
    'dashboardContentApi',
    'finalExamApi',
    'peopleApi',
    'satisfactionApi',
  ];

  assert.doesNotMatch(source, /apiClient\./);
  domains.forEach((domain) => assert.match(source, new RegExp(`export \\* from './${domain}'`)));

  const implementations = await Promise.all(domains.map((domain) => readService(`${domain}.js`)));
  implementations.forEach((implementation) => assert.match(implementation, /from '\.\/httpClient'/));
});

test('client telemetry remains outside the initial application bundle', async () => {
  const source = await readFile(new URL('../src/plugins/errorMonitoring.js', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /^import .*clientTelemetryApi/m);
  assert.match(source, /import\([\s\S]*clientTelemetryApi/);
  assert.match(source, /webpackChunkName: "client-telemetry"/);
});
