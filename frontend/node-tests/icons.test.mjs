import assert from 'node:assert/strict';
import test from 'node:test';
import { appIconPaths, resolveAppIconPath } from '../src/plugins/icons.js';

test('registers every application icon as an SVG path', () => {
  assert.equal(Object.keys(appIconPaths).length, 68);

  for (const [name, path] of Object.entries(appIconPaths)) {
    assert.match(name, /^mdi-[a-z0-9-]+$/);
    assert.match(path, /^[mzlhvcsqta]\s*[-+.0-9]/i);
  }
});

test('resolves registered icons and accepts raw SVG paths', () => {
  assert.equal(resolveAppIconPath('mdi-menu'), appIconPaths['mdi-menu']);

  const rawPath = 'M1 2L3 4Z';
  assert.equal(resolveAppIconPath(rawPath), rawPath);
});

test('rejects missing and invalid icon values', () => {
  assert.equal(resolveAppIconPath('mdi-not-registered'), '');
  assert.equal(resolveAppIconPath('not-an-svg-path'), '');
  assert.equal(resolveAppIconPath(null), '');
});
