import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, request as proxyRequest } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGzip } from 'node:zlib';
import { STATIC_SECURITY_HEADERS } from '../../scripts/securityHeaders.mjs';

const frontendRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const distRoot = path.join(frontendRoot, 'dist');
const indexPath = path.join(distRoot, 'index.html');
const host = '127.0.0.1';
const port = Number(process.env.E2E_PORT || 8080);
const backendPort = Number(process.env.E2E_BACKEND_PORT || 8001);
const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.eot', 'application/vnd.ms-fontobject'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.ttf', 'font/ttf'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);
const compressibleExtensions = new Set(['.css', '.html', '.js', '.json', '.svg']);

if (!existsSync(indexPath)) {
  console.error('frontend/dist is missing. Run npm run build before E2E tests.');
  process.exit(1);
}

const resolveAsset = (requestUrl) => {
  const url = new URL(requestUrl || '/', `http://${host}:${port}`);
  let pathname = decodeURIComponent(url.pathname);

  if (pathname === '/momars' || pathname === '/momars/') {
    return indexPath;
  }

  if (pathname.startsWith('/momars/')) {
    pathname = pathname.slice('/momars/'.length);
  } else {
    pathname = pathname.replace(/^\/+/, '');
  }

  const candidate = path.resolve(distRoot, pathname);

  if (
    candidate.startsWith(`${distRoot}${path.sep}`)
    && existsSync(candidate)
    && statSync(candidate).isFile()
  ) {
    return candidate;
  }

  return indexPath;
};

const proxyApiRequest = (request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${host}:${port}`);
  const upstreamPath = `${requestUrl.pathname.slice('/momars'.length)}${requestUrl.search}`;
  const upstream = proxyRequest({
    hostname: '127.0.0.1',
    port: backendPort,
    method: request.method,
    path: upstreamPath,
    headers: {
      ...request.headers,
      host: `127.0.0.1:${backendPort}`,
    },
  }, (upstreamResponse) => {
    const acceptsGzip = /\bgzip\b/.test(request.headers['accept-encoding'] || '');
    const contentType = String(upstreamResponse.headers['content-type'] || '');
    const useGzip = acceptsGzip
      && !upstreamResponse.headers['content-encoding']
      && /(?:json|javascript|text|xml|svg)/i.test(contentType);
    const headers = { ...upstreamResponse.headers };

    if (useGzip) {
      delete headers['content-length'];
      headers['content-encoding'] = 'gzip';
      headers.vary = 'Accept-Encoding';
    }

    response.writeHead(upstreamResponse.statusCode || 502, headers);

    if (useGzip) {
      upstreamResponse.pipe(createGzip()).pipe(response);
      return;
    }

    upstreamResponse.pipe(response);
  });

  upstream.on('error', (error) => {
    if (!response.headersSent) {
      response.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    }

    response.end(error instanceof Error ? error.message : 'Unable to reach the test API.');
  });

  request.pipe(upstream);
};

const server = createServer((request, response) => {
  try {
    const requestUrl = new URL(request.url || '/', `http://${host}:${port}`);

    if (requestUrl.pathname === '/momars/api' || requestUrl.pathname.startsWith('/momars/api/')) {
      proxyApiRequest(request, response);
      return;
    }

    const filePath = resolveAsset(request.url);
    const extension = path.extname(filePath).toLowerCase();

    const acceptsGzip = /\bgzip\b/.test(request.headers['accept-encoding'] || '');
    const useGzip = acceptsGzip && compressibleExtensions.has(extension);
    const isHashedAsset = /\.[a-f0-9]{8}\.(?:css|js)$/i.test(path.basename(filePath));

    response.writeHead(200, {
      ...STATIC_SECURITY_HEADERS,
      'Cache-Control': isHashedAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
      'Content-Type': contentTypes.get(extension) || 'application/octet-stream',
      ...(useGzip ? { 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' } : {}),
    });
    const fileStream = createReadStream(filePath);

    if (useGzip) {
      fileStream.pipe(createGzip()).pipe(response);
      return;
    }

    fileStream.pipe(response);
  } catch (error) {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(error instanceof Error ? error.message : 'Unable to serve test asset.');
  }
});

const close = () => server.close(() => process.exit(0));

process.on('SIGINT', close);
process.on('SIGTERM', close);

server.listen(port, host, () => {
  console.log(`E2E frontend ready at http://${host}:${port}/momars/`);
});
