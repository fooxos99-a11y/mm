import { pathToFileURL } from 'node:url';

const trimTrailingSlashes = (value) => {
  let end = value.length;

  while (end > 0 && value[end - 1] === '/') {
    end -= 1;
  }

  return value.slice(0, end);
};

// Response details come from the monitored server; keep each log entry on one line.
export const toSingleLineLogValue = (value) => Array.from(String(value ?? ''), (character) => {
  const code = character.codePointAt(0);

  return code < 32 || code === 127 ? ' ' : character;
}).join('');

const timedFetch = async (url, timeoutMs) => {
  const startedAt = performance.now();
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });

  return { response, durationMs: Math.round(performance.now() - startedAt) };
};

export const runMonitor = async ({ baseUrl, timeoutMs = 10000, maxLatencyMs = 2000 }) => {
  const root = new URL(baseUrl);
  root.pathname = `${trimTrailingSlashes(root.pathname)}/`;
  const results = [];
  const check = async (name, path, validate) => {
    try {
      const { response, durationMs } = await timedFetch(new URL(path, root), timeoutMs);
      const body = await response.text();
      await validate(response, body, durationMs);
      results.push({ name, passed: true, durationMs, detail: `HTTP ${response.status}` });
    } catch (error) {
      results.push({
        name,
        passed: false,
        durationMs: 0,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const validateAvailable = async (response, _body, durationMs) => {
    if (!response.ok) throw new Error(`availability returned HTTP ${response.status}`);
    if (durationMs > maxLatencyMs) throw new Error(`latency ${durationMs}ms exceeds ${maxLatencyMs}ms`);
  };

  await check('availability', 'up', validateAvailable);
  await check('operations', 'api/health/operations', async (response, body, durationMs) => {
    await validateAvailable(response, body, durationMs);
    const report = JSON.parse(body);
    if (report.status !== 'healthy') throw new Error(`operations status is ${report.status || 'unknown'}`);
    if (!report.checks?.database || !report.checks?.cache) throw new Error('database or cache check failed');
    if (Number(report.metrics?.queue?.failed || 0) > 0) throw new Error('failed queue jobs detected');
    if (Number(report.metrics?.errorsLastFiveMinutes || 0) > 0) throw new Error('recent application errors detected');
  });
  await check('public-api', 'api/public/stats', async (response, body, durationMs) => {
    await validateAvailable(response, body, durationMs);
    JSON.parse(body);
  });

  return { passed: results.every((result) => result.passed), results };
};

const describeFailure = (item) => `${item.name}: ${item.detail}`;

export const sendAlert = async (webhookUrl, report, baseUrl) => {
  if (!webhookUrl) return;
  const failures = report.results.filter((result) => !result.passed);
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `Momars production monitor failed for ${baseUrl}: ${failures.map(describeFailure).join('; ')}`,
      status: 'failure',
      service: 'momars',
      failures,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Alert webhook returned HTTP ${response.status}`);
};

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMain) {
  const baseUrl = process.env.MONITOR_URL;
  if (!baseUrl) {
    console.error('MONITOR_URL is required.');
    process.exit(1);
  }

  const report = await runMonitor({
    baseUrl,
    timeoutMs: Number(process.env.MONITOR_TIMEOUT_MS || 10000),
    maxLatencyMs: Number(process.env.MONITOR_MAX_LATENCY_MS || 2000),
  });
  report.results.forEach((result) => {
    const outcome = result.passed ? 'PASS' : 'FAIL';
    console.log(`${outcome} ${result.name} (${result.durationMs}ms): ${toSingleLineLogValue(result.detail)}`);
  });

  if (!report.passed) {
    try {
      await sendAlert(process.env.ALERT_WEBHOOK_URL, report, baseUrl);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
    }
    process.exitCode = 1;
  }
}
