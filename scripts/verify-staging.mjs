const rawBaseUrl = process.env.STAGING_URL;
const allowInsecure = process.env.ALLOW_INSECURE_STAGING === '1';
const requestTimeoutMs = Number(process.env.STAGING_TIMEOUT_MS || 20000);
const corsOrigin = process.env.STAGING_CORS_ORIGIN || '';

if (!rawBaseUrl) {
  console.error('STAGING_URL is required, for example https://example.test/momars');
  process.exit(1);
}

const baseUrl = new URL(rawBaseUrl);

if (baseUrl.protocol !== 'https:' && !allowInsecure) {
  console.error('Staging must use HTTPS. Set ALLOW_INSECURE_STAGING=1 only for an isolated local environment.');
  process.exit(1);
}

baseUrl.pathname = baseUrl.pathname.replace(/\/+$/, '') + '/';
baseUrl.search = '';
baseUrl.hash = '';

const results = [];
const failures = [];

const record = (name, passed, detail, durationMs) => {
  results.push({ name, passed, detail, durationMs });

  if (!passed) {
    failures.push(name + ': ' + detail);
  }
};

const request = async (name, path, options, validate) => {
  const url = new URL(path.replace(/^\/+/, ''), baseUrl);
  const startedAt = performance.now();

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(requestTimeoutMs),
      ...options,
      headers: {
        Accept: 'application/json, text/html;q=0.9',
        ...(options && options.headers ? options.headers : {}),
      },
    });
    const body = await response.text();
    const detail = await validate(response, body);

    record(name, true, detail, Math.round(performance.now() - startedAt));
  } catch (error) {
    record(
      name,
      false,
      error instanceof Error ? error.message : String(error),
      Math.round(performance.now() - startedAt),
    );
  }
};

const expectJson = async (response, body) => {
  if (!response.ok) {
    throw new Error('Expected 2xx, received ' + response.status);
  }

  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    throw new Error('Expected JSON, received ' + (contentType || 'unknown content type'));
  }

  JSON.parse(body);

  if (!(response.headers.get('content-security-policy') || '').includes("default-src 'none'")) {
    throw new Error('API Content-Security-Policy header is missing or unsafe');
  }

  return 'HTTP ' + response.status;
};

await request('Frontend /momars', '', {}, async (response, body) => {
  if (!response.ok) {
    throw new Error('Expected 2xx, received ' + response.status);
  }

  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('text/html') || !body.includes('id="app"')) {
    throw new Error('Response is not the expected Vue application shell');
  }

  if (!(response.headers.get('content-security-policy') || '').includes("script-src 'self'")) {
    throw new Error('Frontend Content-Security-Policy header is missing or unsafe');
  }

  return 'HTTP ' + response.status;
});

await request('Laravel health', 'up', {}, async (response) => {
  if (!response.ok) {
    throw new Error('Expected 2xx, received ' + response.status);
  }

  return 'HTTP ' + response.status;
});

await request('Operational health', 'api/health/operations', {}, async (response, body) => {
  if (!response.ok) {
    throw new Error('Expected healthy 2xx, received ' + response.status);
  }

  const report = JSON.parse(body);
  if (report.status !== 'healthy' || !report.checks?.database || !report.checks?.cache) {
    throw new Error('Database, cache, error, or queue health is degraded');
  }

  return 'HTTP ' + response.status;
});

await request('Public stats API', 'api/public/stats', {}, expectJson);
await request('Public registration API', 'api/public/registration', {}, expectJson);
await request('Public snapshot API', 'api/public/snapshot', {}, expectJson);

await request('Protected API boundary', 'api/auth/user', {}, async (response) => {
  if (response.status !== 401) {
    throw new Error('Expected 401, received ' + response.status);
  }

  return 'HTTP 401 as expected';
});

if (corsOrigin) {
  await request(
    'CORS preflight',
    'api/public/stats',
    {
      method: 'OPTIONS',
      headers: {
        Origin: corsOrigin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'content-type',
      },
    },
    async (response) => {
      const allowedOrigin = response.headers.get('access-control-allow-origin');
      const allowsCredentials = response.headers.get('access-control-allow-credentials');

      if (![200, 204].includes(response.status)) {
        throw new Error('Expected 200/204, received ' + response.status);
      }

      if (allowedOrigin !== corsOrigin || allowsCredentials !== 'true') {
        throw new Error('CORS origin or credentials headers are incorrect');
      }

      return 'HTTP ' + response.status + ', origin accepted';
    },
  );
}

for (const result of results) {
  const mark = result.passed ? 'PASS' : 'FAIL';
  console.log(mark + ' ' + result.name + ' (' + result.durationMs + 'ms): ' + result.detail);
}

if (failures.length > 0) {
  console.error('Staging verification failed with ' + failures.length + ' error(s).');
  process.exit(1);
}

console.log('Staging verification passed for ' + baseUrl.href);
