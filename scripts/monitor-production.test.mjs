import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { runMonitor, sendAlert } from './monitor-production.mjs';

const withServer = async (handler, callback) => {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await callback(`http://127.0.0.1:${port}/momars/`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

test('production monitor validates availability latency operations and public API', async () => {
  await withServer((request, response) => {
    response.setHeader('Content-Type', 'application/json');
    if (request.url === '/momars/api/health/operations') {
      response.end(JSON.stringify({
        status: 'healthy',
        checks: { database: true, cache: true },
        metrics: { queue: { failed: 0 }, errorsLastFiveMinutes: 0 },
      }));
      return;
    }
    response.end(request.url.endsWith('/up') ? 'OK' : '{}');
  }, async (baseUrl) => {
    const report = await runMonitor({ baseUrl, maxLatencyMs: 1000 });
    assert.equal(report.passed, true);
    assert.deepEqual(report.results.map((item) => item.name), ['availability', 'operations', 'public-api']);
  });
});

test('degraded operations fail monitoring and alert webhook receives details', async () => {
  let alertPayload = null;
  await withServer(async (request, response) => {
    response.setHeader('Content-Type', 'application/json');
    if (request.url === '/momars/api/health/operations') {
      response.statusCode = 503;
      response.end(JSON.stringify({ status: 'degraded' }));
      return;
    }
    if (request.url === '/momars/alert') {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      alertPayload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      response.end('{}');
      return;
    }
    response.end(request.url.endsWith('/up') ? 'OK' : '{}');
  }, async (baseUrl) => {
    const report = await runMonitor({ baseUrl, maxLatencyMs: 1000 });
    assert.equal(report.passed, false);
    await sendAlert(new URL('alert', baseUrl).href, report, baseUrl);
    assert.equal(alertPayload.status, 'failure');
    assert.match(alertPayload.text, /operations/);
  });
});
