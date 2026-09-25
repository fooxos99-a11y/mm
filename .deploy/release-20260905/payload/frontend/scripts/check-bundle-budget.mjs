import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const distRoot = path.join(frontendRoot, 'dist');
const html = await readFile(path.join(distRoot, 'index.html'), 'utf8');

const extractUrls = (pattern) => [...html.matchAll(pattern)].map((match) => match[1]);
const scriptUrls = extractUrls(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi);
const styleUrls = [...html.matchAll(/<link\b[^>]*>/gi)]
  .map((match) => match[0])
  .filter((tag) => /\brel=["']stylesheet["']/i.test(tag))
  .map((tag) => tag.match(/\bhref=["']([^"']+)["']/i)?.[1])
  .filter(Boolean);
const inlineCriticalStyles = [...html.matchAll(/<style\b[^>]*data-critical=["']app["'][^>]*>([\s\S]*?)<\/style>/gi)]
  .map((match) => match[1]);

const toAssetPath = (url) => {
  const pathname = decodeURIComponent(new URL(url, 'https://bundle.local').pathname)
    .replace(/^\/+/, '')
    .replace(/^momars\//, '');

  return path.join(distRoot, ...pathname.split('/'));
};

const gzipTotal = async (urls) => {
  const sizes = await Promise.all(
    urls.map(async (url) => gzipSync(await readFile(toAssetPath(url))).byteLength),
  );

  return sizes.reduce((total, size) => total + size, 0);
};

const initialJsKiB = (await gzipTotal(scriptUrls)) / 1024;
const inlineCssBytes = inlineCriticalStyles
  .reduce((total, css) => total + gzipSync(css).byteLength, 0);
const initialCssKiB = ((await gzipTotal(styleUrls)) + inlineCssBytes) / 1024;
const limits = {
  js: 100,
  // Includes the public landing page's above-the-fold styles so its LCP does
  // not wait for a second stylesheet request.
  css: 12,
};
const lazyChunkNames = [
  'exceljs',
  'rich-text-editor',
  'dashboard-realtime',
  'public-account-dialogs',
  'public-home-programs',
  'public-home-supporting',
  'vuetify-app-shell',
  'toast-runtime',
  'public-api',
  'client-telemetry',
  'store-auth',
  'store-dashboard',
];
const initialUrls = [...scriptUrls, ...styleUrls].join('\n').toLowerCase();
const unexpectedlyInitial = lazyChunkNames.filter((name) => initialUrls.includes(name));
const failures = [];

if (scriptUrls.length === 0 || (styleUrls.length === 0 && inlineCriticalStyles.length === 0)) {
  failures.push('Could not find the initial JavaScript or critical CSS in dist/index.html.');
}

if (initialJsKiB > limits.js) {
  failures.push(`Initial JS is ${initialJsKiB.toFixed(2)} KiB gzip (limit ${limits.js} KiB).`);
}

if (initialCssKiB > limits.css) {
  failures.push(`Initial CSS is ${initialCssKiB.toFixed(2)} KiB gzip (limit ${limits.css} KiB).`);
}

if (unexpectedlyInitial.length > 0) {
  failures.push(`Lazy chunks leaked into index.html: ${unexpectedlyInitial.join(', ')}.`);
}

console.log(`Initial JS: ${initialJsKiB.toFixed(2)} KiB gzip / ${limits.js} KiB`);
console.log(`Initial CSS: ${initialCssKiB.toFixed(2)} KiB gzip / ${limits.css} KiB`);
console.log(`Deferred chunks: ${lazyChunkNames.join(', ')}`);

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure);
  }

  process.exitCode = 1;
}
