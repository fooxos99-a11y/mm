import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CONTENT_SECURITY_POLICY, STATIC_SECURITY_HEADERS, buildContentSecurityPolicy, toOrigin,
} from '../scripts/securityHeaders.mjs';

test('production CSP blocks executable third-party and object content', () => {
  assert.match(CONTENT_SECURITY_POLICY, /script-src 'self'/);
  assert.match(CONTENT_SECURITY_POLICY, /object-src 'none'/);
  assert.match(CONTENT_SECURITY_POLICY, /frame-ancestors 'self'/);
  assert.doesNotMatch(CONTENT_SECURITY_POLICY, /unsafe-eval/);
  assert.doesNotMatch(CONTENT_SECURITY_POLICY, /script-src[^;]*\*/);
  assert.match(CONTENT_SECURITY_POLICY, /frame-src 'self' https:\/\/www\.youtube\.com/);
  assert.match(CONTENT_SECURITY_POLICY, /media-src 'self' blob:/);
});

test('static server security headers prevent sniffing and framing', () => {
  assert.equal(STATIC_SECURITY_HEADERS['X-Content-Type-Options'], 'nosniff');
  assert.equal(STATIC_SECURITY_HEADERS['X-Frame-Options'], 'SAMEORIGIN');
  assert.equal(STATIC_SECURITY_HEADERS['Content-Security-Policy'], CONTENT_SECURITY_POLICY);
});

test('CSP lists explicit API origins instead of host wildcards', () => {
  assert.doesNotMatch(CONTENT_SECURITY_POLICY, /:\*/);
  assert.match(CONTENT_SECURITY_POLICY, /connect-src 'self' https: wss: ws: [^;]*http:\/\/127\.0\.0\.1:8001/);

  const policy = buildContentSecurityPolicy({
    apiOrigins: ['http://127.0.0.1:45123/api', 'not a url', 'javascript:alert(1)'],
    includeFrameAncestors: false,
  });
  assert.match(policy, /http:\/\/127\.0\.0\.1:45123(;| )/);
  assert.doesNotMatch(policy, /frame-ancestors|javascript|not a url/);
  assert.equal(toOrigin('https://api.example.test/api/x'), 'https://api.example.test');
  assert.equal(toOrigin(undefined), '');
});
