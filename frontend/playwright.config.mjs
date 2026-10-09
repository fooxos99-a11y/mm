import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const backendRoot = fileURLToPath(new URL('../backend/', import.meta.url));
const backendPort = Number(process.env.E2E_BACKEND_PORT || 8001);
const frontendPort = Number(process.env.E2E_FRONTEND_PORT || process.env.E2E_PORT || 8080);
const backendOrigin = `http://127.0.0.1:${backendPort}`;
const frontendOrigin = `http://127.0.0.1:${frontendPort}`;
const browserChannel = process.env.PLAYWRIGHT_CHANNEL
  || (process.env.CI ? undefined : 'chrome');
const captureScreenshots = process.env.E2E_CAPTURE_SCREENSHOTS === '1';
const viewportProjects = [
  { name: 'mobile-320', viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true },
  { name: 'mobile-390', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
  { name: 'tablet-768', viewport: { width: 768, height: 1024 }, hasTouch: true, isMobile: true },
  { name: 'laptop-1024', viewport: { width: 1024, height: 768 }, hasTouch: false, isMobile: false },
  { name: 'desktop-1440', viewport: { width: 1440, height: 900 }, hasTouch: false, isMobile: false },
];

export default defineConfig({
  testDir: './e2e',
  outputDir: 'test-results',
  timeout: 120_000,
  expect: {
    timeout: 20_000,
  },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['line'], ['html', { open: 'never' }]]
    : [['line']],
  use: {
    baseURL: process.env.E2E_BASE_URL || `${frontendOrigin}/momars/`,
    browserName: 'chromium',
    ...(browserChannel ? { channel: browserChannel } : {}),
    locale: 'ar-SA',
    trace: { mode: 'retain-on-failure', screenshots: captureScreenshots },
    screenshot: captureScreenshots ? 'only-on-failure' : 'off',
    video: 'off',
  },
  projects: viewportProjects.map((project) => ({
    name: project.name,
    use: {
      viewport: project.viewport,
      hasTouch: project.hasTouch,
      isMobile: project.isMobile,
      deviceScaleFactor: 1,
    },
  })),
  webServer: [
    {
      command: `node ../scripts/run-php.mjs -d max_execution_time=300 -d opcache.enable_cli=1 -S 127.0.0.1:${backendPort} -t public ../frontend/e2e/support/backend-router.php`,
      cwd: backendRoot,
      // Browser tests must exercise CSRF; Laravel bypasses it in the testing environment.
      env: { APP_ENV: 'local' },
      url: `${backendOrigin}/up`,
      timeout: 300_000,
      reuseExistingServer: false,
    },
    {
      command: 'node e2e/support/serve-dist.mjs',
      url: `${frontendOrigin}/momars/`,
      timeout: 30_000,
      reuseExistingServer: false,
    },
  ],
});
