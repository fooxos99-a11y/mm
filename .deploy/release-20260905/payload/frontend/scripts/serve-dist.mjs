import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGzip } from 'node:zlib';
import { STATIC_SECURITY_HEADERS } from './securityHeaders.mjs';

const frontendRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const distRoot = path.join(frontendRoot, 'dist');
const port = Number(process.env.PORT || 8082);
const basePath = `/${String(process.env.PUBLIC_PATH || 'momars').replace(/^\/+|\/+$/g, '')}`;
const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);
const compressibleExtensions = new Set(['.css', '.html', '.js', '.json', '.svg']);

const resolveAssetPath = (pathname) => {
  const relativePath = pathname === basePath || pathname === `${basePath}/`
    ? 'index.html'
    : pathname.slice(basePath.length).replace(/^\/+/, '');
  const targetPath = path.resolve(distRoot, relativePath);

  return targetPath.startsWith(`${distRoot}${path.sep}`) || targetPath === distRoot
    ? targetPath
    : null;
};

const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname);
  let targetPath = pathname === '/robots.txt'
    ? path.join(distRoot, 'robots.txt')
    : null;

  if (!targetPath && !pathname.startsWith(basePath)) {
    response.writeHead(302, { Location: `${basePath}/` });
    response.end();
    return;
  }

  targetPath ||= resolveAssetPath(pathname);

  try {
    if (!targetPath || !(await stat(targetPath)).isFile()) {
      targetPath = path.join(distRoot, 'index.html');
    }
  } catch {
    targetPath = path.join(distRoot, 'index.html');
  }

  const extension = path.extname(targetPath).toLowerCase();
  const shouldCompress = compressibleExtensions.has(extension)
    && /\bgzip\b/i.test(request.headers['accept-encoding'] || '');
  const headers = {
    ...STATIC_SECURITY_HEADERS,
    'Content-Type': contentTypes.get(path.extname(targetPath).toLowerCase()) || 'application/octet-stream',
    'Cache-Control': targetPath.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
    Vary: 'Accept-Encoding',
  };

  if (shouldCompress) {
    headers['Content-Encoding'] = 'gzip';
  }

  response.writeHead(200, headers);

  const source = createReadStream(targetPath);
  if (shouldCompress) {
    source.pipe(createGzip()).pipe(response);
  } else {
    source.pipe(response);
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Production build available at http://127.0.0.1:${port}${basePath}/`);
});
