import { spawn, spawnSync } from 'node:child_process';
import { resolveTrustedExecutable } from '../../scripts/trustedExecutable.mjs';
import { request } from 'node:http';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';

const frontendRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const getAvailablePort = () => new Promise((resolve, reject) => {
  const server = createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    server.close(() => resolve(typeof address === 'object' && address ? address.port : 0));
  });
});
const waitForUrl = (url, attempts = 40) => new Promise((resolve, reject) => {
  const check = (remaining) => {
    request(url, (response) => {
      response.resume();
      if (response.statusCode === 200) resolve();
      else if (remaining > 0) setTimeout(() => check(remaining - 1), 250);
      else reject(new Error(`Static server returned ${response.statusCode}.`));
    }).on('error', (error) => {
      if (remaining > 0) setTimeout(() => check(remaining - 1), 250);
      else reject(error);
    }).end();
  };
  check(attempts);
});

const terminateChrome = async (instance) => {
  if (!instance) return;

  const pid = instance.pid;
  try {
    await instance.kill();
    return;
  } catch (error) {
    const taskkill = process.platform === 'win32' ? resolveTrustedExecutable('taskkill') : null;
    if (taskkill && pid) {
      spawnSync(taskkill, ['/pid', String(pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
    } else if (pid) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        // The process may have exited while cleanup was running.
      }
    }

    if (error?.code !== 'EBUSY' && error?.code !== 'ESRCH') {
      console.warn(`Chrome cleanup warning: ${error.message}`);
    }
  }
};

const runAudit = async (url) => {
  let chrome;
  try {
    chrome = await launch({
      chromePath: process.env.CHROME_PATH,
      chromeFlags: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage'],
    });
    return await lighthouse(url, {
      port: chrome.port,
      logLevel: 'error',
      output: 'json',
      onlyCategories: ['performance'],
      formFactor: 'mobile',
    });
  } finally {
    await terminateChrome(chrome);
  }
};

const port = await getAvailablePort();
const url = `http://127.0.0.1:${port}/momars/`;
const staticServer = spawn(process.execPath, ['e2e/support/serve-dist.mjs'], {
  cwd: frontendRoot,
  env: { ...process.env, E2E_PORT: String(port), E2E_BACKEND_PORT: '9' },
  stdio: 'ignore',
});

try {
  await waitForUrl(url);
  let result;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    result = await runAudit(url);
    if (!result?.lhr?.runtimeError || attempt === 2) break;
    console.warn(`Lighthouse attempt ${attempt} returned ${result.lhr.runtimeError.code}; retrying once.`);
  }

  const score = Math.round((result?.lhr?.categories?.performance?.score || 0) * 100);
  const lcp = Math.round(result?.lhr?.audits?.['largest-contentful-paint']?.numericValue || Infinity);

  if (result?.lhr?.runtimeError) {
    console.error(`Lighthouse runtime error: ${result.lhr.runtimeError.code} ${result.lhr.runtimeError.message}`);
  }

  console.log(`Mobile Lighthouse performance: ${score}/100`);
  console.log(`Mobile Lighthouse LCP: ${lcp} ms`);

  if (process.env.MOBILE_PERFORMANCE_DIAGNOSTICS === 'true') {
    const diagnostics = Object.entries(result?.lhr?.audits || {})
      .filter(([key]) => key.includes('lcp') || key.includes('largest-contentful-paint'))
      .map(([key, audit]) => ({
        key,
        displayValue: audit.displayValue,
        numericValue: audit.numericValue,
        details: audit.details,
      }));
    console.log(`LCP diagnostics: ${JSON.stringify(diagnostics)}`);
    const matchingTraceEvents = (result?.artifacts?.Trace?.traceEvents || [])
      .filter((event) => String(event.name || '').toLowerCase().includes('largestcontentfulpaint'));
    const traceCandidates = matchingTraceEvents
      .filter((event) => /candidate/i.test(String(event.name || '')) || event.args?.data?.size)
      .slice(-12)
      .map((event) => ({ name: event.name, args: event.args || null }));
    const traceEventNames = [...new Set(matchingTraceEvents.map((event) => event.name))];
    if (traceEventNames.length) console.log(`LCP trace event names: ${JSON.stringify(traceEventNames)}`);
    if (traceCandidates.length) console.log(`LCP trace candidates: ${JSON.stringify(traceCandidates)}`);
  }

  if (score < 90 || lcp > 2500) {
    const lcpDetails = result?.lhr?.audits?.['lcp-breakdown-insight']?.details
      || result?.lhr?.audits?.['largest-contentful-paint-element']?.details;
    if (lcpDetails) console.error(`LCP details: ${JSON.stringify(lcpDetails)}`);
    const lcpDiagnostics = Object.entries(result?.lhr?.audits || {})
      .filter(([key]) => key.includes('lcp') || key.includes('largest-contentful-paint'))
      .map(([key, audit]) => ({
        key,
        displayValue: audit.displayValue,
        numericValue: audit.numericValue,
        details: audit.details,
      }));
    if (lcpDiagnostics.length) console.error(`LCP diagnostics: ${JSON.stringify(lcpDiagnostics)}`);
    console.error('Mobile performance gate failed: requires score >= 90 and LCP <= 2500 ms.');
    process.exitCode = 1;
  }
} finally {
  staticServer.kill('SIGTERM');
}
