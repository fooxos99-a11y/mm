import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCsv, escapeCsvCell } from '../src/utils/csv.mjs';

// Runs with Node's built-in test runner; no browser test dependency is required.

test('escapeCsvCell neutralizes spreadsheet formula prefixes', () => {
  for (const value of ['=1+1', '+SUM(A1:A2)', '-10+20', '@cmd', '\tformula', '\rformula']) {
    assert.equal(escapeCsvCell(value), `"'${value}"`);
  }
});

test('escapeCsvCell escapes quotes without changing safe values', () => {
  assert.equal(escapeCsvCell('safe value'), '"safe value"');
  assert.equal(escapeCsvCell('a "quoted" value'), '"a ""quoted"" value"');
});

test('buildCsv uses CRLF and protects every cell', () => {
  assert.equal(
    buildCsv([['loginCode', 'name'], ['=attack', 'Normal']]),
    '"loginCode","name"\r\n"\'=attack","Normal"',
  );
});
