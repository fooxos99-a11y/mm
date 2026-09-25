import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('the E2E runner provides an isolated Laravel encryption key', async () => {
  const source = await readFile(new URL('../scripts/run-e2e.mjs', import.meta.url), 'utf8');

  assert.match(source, /import \{ randomBytes \} from 'node:crypto'/);
  assert.match(source, /APP_KEY: `base64:\$\{randomBytes\(32\)\.toString\('base64'\)\}`/);
});
