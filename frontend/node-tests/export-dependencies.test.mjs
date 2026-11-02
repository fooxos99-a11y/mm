import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';

const require = createRequire(import.meta.url);
const excelRequire = createRequire(require.resolve('exceljs'));
const archiver = excelRequire('archiver');
const archiveRequire = createRequire(excelRequire.resolve('archiver'));
const utilsRequire = createRequire(archiveRequire.resolve('archiver-utils'));
const { globSync } = utilsRequire('glob');

test('Excel exports retain Arabic text and numbers after dependency updates', async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet('الطلاب').addRow(['طالب التحضير', 123]);
  const restored = new ExcelJS.Workbook();
  await restored.xlsx.load(await workbook.xlsx.writeBuffer());
  assert.equal(restored.worksheets[0].getCell('A1').value, 'طالب التحضير');
  assert.equal(restored.worksheets[0].getCell('B1').value, 123);
});

test('streaming Excel exports work with the updated archive implementation', async () => {
  const stream = new PassThrough();
  const chunks = [];
  stream.on('data', chunk => chunks.push(chunk));
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream });
  workbook.addWorksheet('الطلاب').addRow(['طالب التحضير', 123]).commit();
  await workbook.commit();
  const restored = new ExcelJS.Workbook();
  await restored.xlsx.load(Buffer.concat(chunks));
  assert.equal(restored.worksheets[0].getCell('A1').value, 'طالب التحضير');
});

test('archive and glob dependencies match and compress files', async () => {
  const cwd = fileURLToPath(new URL('.', import.meta.url));
  assert.ok(globSync('*.test.mjs', { cwd }).includes('export-dependencies.test.mjs'));
  const archive = archiver('zip');
  const chunks = [];
  archive.on('data', chunk => chunks.push(chunk));
  const completed = new Promise((resolve, reject) => {
    archive.once('end', resolve);
    archive.once('error', reject);
  });
  archive.glob('export-dependencies.test.mjs', { cwd });
  await Promise.all([archive.finalize(), completed]);
  const zip = Buffer.concat(chunks);
  assert.equal(zip.subarray(0, 2).toString(), 'PK');
  assert.equal(archive.pointer(), zip.length);
  assert.ok(zip.includes(Buffer.from('export-dependencies.test.mjs')));
});
