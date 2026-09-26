import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import os from 'node:os';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const workspaceRoot = path.resolve(frontendRoot, '..');
const phpRunner = path.join(workspaceRoot, 'scripts', 'run-php.mjs');
const artisan = path.join(workspaceRoot, 'backend', 'artisan');
const playwrightCli = path.join(frontendRoot, 'node_modules', '@playwright', 'test', 'cli.js');
const viteCli = path.join(frontendRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const databasePath = path.join(os.tmpdir(), `momars-e2e-${process.pid}.sqlite`);
const adminLogin = 'e2e-admin';
// Throw-away accounts for the temporary SQLite database, regenerated on every run.
const createTestSecret = () => `E2e-${randomBytes(12).toString('base64url')}-9`;
const adminSecret = createTestSecret();
const roleSecret = createTestSecret();
const studentSecret = createTestSecret();
const newAccountSecret = createTestSecret();
const getAvailablePort = () => new Promise((resolve, reject) => {
  const server = createServer();

  server.unref();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;

    server.close((error) => {
      if (error) reject(error);
      else resolve(port);
    });
  });
});
const backendPort = Number(process.env.E2E_BACKEND_PORT) || await getAvailablePort();
const frontendPort = Number(process.env.E2E_FRONTEND_PORT) || await getAvailablePort();
const backendOrigin = `http://127.0.0.1:${backendPort}`;
const frontendOrigin = `http://127.0.0.1:${frontendPort}`;
const e2eEnv = {
  ...process.env,
  APP_KEY: `base64:${randomBytes(32).toString('base64')}`,
  APP_ENV: 'testing',
  APP_DEBUG: 'false',
  APP_URL: backendOrigin,
  FRONTEND_URL: frontendOrigin,
  DB_CONNECTION: 'sqlite',
  DB_DATABASE: databasePath,
  CACHE_STORE: 'array',
  SESSION_DRIVER: 'database',
  SESSION_SECURE_COOKIE: 'false',
  SANCTUM_STATEFUL_DOMAINS: `127.0.0.1:${frontendPort},localhost:${frontendPort},127.0.0.1:${backendPort},localhost:${backendPort}`,
  CORS_ALLOWED_ORIGINS: `${frontendOrigin},http://localhost:${frontendPort}`,
  E2E_BACKEND_PORT: String(backendPort),
  E2E_FRONTEND_PORT: String(frontendPort),
  E2E_PORT: String(frontendPort),
  E2E_BASE_URL: `${frontendOrigin}/momars/`,
  VUE_APP_PUBLIC_PATH: '/momars/',
  VUE_APP_ROUTER_BASE: '/momars/',
  VUE_APP_API_BASE_URL: `${backendOrigin}/api`,
  BROADCAST_CONNECTION: 'log',
  QUEUE_CONNECTION: 'sync',
  MOMARS_SEED_ADMIN_LOGIN: adminLogin,
  MOMARS_SEED_ADMIN_PASSWORD: adminSecret,
  MOMARS_SEED_E2E_ROLE_PASSWORD: roleSecret,
  MOMARS_SEED_ADMIN_NAME: 'E2E Admin',
  MOMARS_SEED_ADMIN_EMAIL: 'e2e-admin@example.test',
  MOMARS_SEED_E2E_ROLES: 'true',
  E2E_ADMIN_LOGIN: adminLogin,
  E2E_ADMIN_PASSWORD: adminSecret,
  E2E_ROLE_PASSWORD: roleSecret,
  E2E_STUDENT_PASSWORD: studentSecret,
  E2E_NEW_ACCOUNT_PASSWORD: newAccountSecret,
};

const removeDatabaseFiles = () => {
  for (const suffix of ['', '-wal', '-shm']) {
    const target = `${databasePath}${suffix}`;

    if (existsSync(target)) {
      rmSync(target, { force: true });
    }
  }
};

removeDatabaseFiles();
writeFileSync(databasePath, '');

try {
  const build = spawnSync(
    process.execPath,
    [viteCli, 'build'],
    {
      cwd: frontendRoot,
      env: e2eEnv,
      stdio: 'inherit',
      shell: false,
    },
  );

  if (build.status !== 0) {
    process.exitCode = build.status ?? 1;
  } else {
    const migration = spawnSync(
      process.execPath,
      [phpRunner, artisan, 'migrate:fresh', '--seed', '--force', '--no-interaction'],
      {
        cwd: frontendRoot,
        env: e2eEnv,
        stdio: 'inherit',
        shell: false,
      },
    );

    if (migration.status !== 0) {
      process.exitCode = migration.status ?? 1;
    } else {
      const result = spawnSync(
        process.execPath,
        [playwrightCli, 'test', ...process.argv.slice(2)],
        {
          cwd: frontendRoot,
          env: e2eEnv,
          stdio: 'inherit',
          shell: false,
        },
      );

      process.exitCode = result.status ?? 1;
    }
  }
} finally {
  removeDatabaseFiles();
}
