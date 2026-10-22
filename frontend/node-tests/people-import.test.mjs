import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareStudentImport, parseImportCsv } from '../src/features/people/peopleImportModel.mjs';

test('registration name wins over empty الاسم and source Id; all rows retain original fields', () => {
  const rows = [['Id', 'وقت الإكمال', 'الاسم', 'الاسم الرباعي : ', 'اسم المجمع/\n'],
    ['1', new Date('2026-01-01T00:00:00Z'), '', 'طالب أول', 'مجمع'],
    ['3', '', '', 'طالب ثان', 'آخر']];
  const entries = prepareStudentImport(rows);
  assert.deepEqual(entries.map(({ name, loginCode, password }) => ({ name, loginCode, password })), [
    { name: 'طالب أول', loginCode: '0700', password: '0700' },
    { name: 'طالب ثان', loginCode: '0701', password: '0701' },
  ]);
  assert.equal(entries[0].sourceFields[4].label, 'اسم المجمع');
  assert.equal(entries[0].sourceFields[1].value, '2026-01-01T00:00:00.000Z');
  assert.equal(entries[1].sourceRow, 3);
});

test('138 entries end at 0837 and hidden-row source indexes are retained', () => {
  const entries = prepareStudentImport([{ cells: ['الاسم الرباعي'], sourceRow: 1 }, ...Array.from({ length: 138 }, (_, i) => ({ cells: [`طالب ${i}`], sourceRow: i + 2 }))]);
  assert.equal(entries.length, 138);
  assert.equal(entries.at(-1).loginCode, '0837');
  assert.equal(entries.at(-1).sourceRow, 139);
});

test('explicit login/password templates retain values and reject missing fields', () => {
  const entries = prepareStudentImport([['الاسم', 'رقم الدخول', 'كلمة المرور'], ['طالب', '0099', 'other']]);
  assert.equal(entries[0].loginCode, '0099');
  assert.equal(entries[0].password, 'other');
  assert.throws(() => prepareStudentImport([['الاسم', 'رقم الدخول'], ['طالب', '']]), /أكمل/);
  assert.throws(() => prepareStudentImport([['الاسم'], ['']]), /الاسم|الملف|فارغ/);
});

test('CSV quotes, multiline cells, CRLF and incomplete quotes', () => {
  assert.deepEqual(parseImportCsv('"a,b",c\r\n"multi\nline","say ""yes"""'), [['a,b', 'c'], ['multi\nline', 'say "yes"']]);
  assert.throws(() => parseImportCsv('"unclosed'), /غير مكتمل/);
});

test('Excel rich text, text and formula results are read as values', () => {
  const entries = prepareStudentImport([
    ['الاسم الرباعي', 'رقم الدخول', 'كلمة المرور', 'اسم المجمع'],
    [{ richText: [{ text: 'طالب ' }, { text: 'منسق' }] }, { text: '0012' }, { result: 'initial' }, { richText: [{ text: 'مجمع' }] }],
  ]);
  assert.equal(entries[0].name, 'طالب منسق');
  assert.equal(entries[0].loginCode, '0012');
  assert.equal(entries[0].password, 'initial');
  assert.equal(entries[0].sourceFields[3].value, 'مجمع');
  assert.throws(() => prepareStudentImport([]), /فارغ/);
  assert.throws(() => prepareStudentImport([['الاسم'], ['طالب']], '7'), /أربعة/);
});
