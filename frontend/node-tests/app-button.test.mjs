import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readComponent = () => readFile(
  new URL('../src/components/ui/AppButton.vue', import.meta.url),
  'utf8',
);

test('shared link buttons block navigation while disabled or loading', async () => {
  const source = await readComponent();

  assert.match(source, /@click\.capture="guardInteraction"/);
  assert.match(source, /:href="isDisabled \? null : href"/);
  assert.match(source, /aria-disabled/);
  assert.match(source, /stopImmediatePropagation/);
});

test('shared buttons expose their loading state to assistive technology', async () => {
  const source = await readComponent();

  assert.match(source, /aria-busy/);
  assert.match(source, /:disabled="isDisabled"/);
});
