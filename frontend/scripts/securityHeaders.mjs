// Local API servers used by `npm run dev` and `serve:dist` (see httpPolicy.mjs).
export const LOCAL_API_ORIGINS = Object.freeze([
  'http://127.0.0.1:8000',
  'http://127.0.0.1:8001',
  'http://localhost:8000',
  'http://localhost:8001',
]);

export const toOrigin = (value) => {
  try {
    const url = new URL(String(value || ''));

    return ['http:', 'https:'].includes(url.protocol) ? url.origin : '';
  } catch {
    return '';
  }
};

const uniqueOrigins = (origins) => Array.from(new Set(origins.map(toOrigin).filter(Boolean)));

// Explicit origins only: no host wildcards. Styles still need 'unsafe-inline'
// because Vuetify injects its theme stylesheet and rich-text content keeps
// inline alignment/colour styles; scripts stay limited to 'self'.
export const buildContentSecurityPolicy = ({ apiOrigins = [], includeFrameAncestors = true } = {}) => [
  "default-src 'self'",
  "base-uri 'self'",
  ["connect-src 'self' https: wss: ws:", ...uniqueOrigins([...LOCAL_API_ORIGINS, ...apiOrigins])].join(' '),
  "font-src 'self' data:",
  "form-action 'self'",
  includeFrameAncestors ? "frame-ancestors 'self'" : null,
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "worker-src 'self' blob:",
].filter(Boolean).join('; ');

export const CONTENT_SECURITY_POLICY = buildContentSecurityPolicy();

const configuredApiOrigins = [process.env.VUE_APP_API_BASE_URL].filter(Boolean);

export const STATIC_SECURITY_HEADERS = {
  'Content-Security-Policy': buildContentSecurityPolicy({ apiOrigins: configuredApiOrigins }),
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
};
