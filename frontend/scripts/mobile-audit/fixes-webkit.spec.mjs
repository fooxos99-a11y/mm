import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
test('WebKit mobile sidebar and dialog reachability', () => {
  const result = spawnSync(process.execPath, ['mobile-fixes-webkit.mjs', process.env.E2E_BASE_URL], {
    encoding: 'utf8', timeout: 140000,
  });
  console.log(result.stdout);
  expect(result.status, result.stderr || result.error?.message).toBe(0);
});
